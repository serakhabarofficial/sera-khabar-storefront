import { z } from "zod";
import { isIP } from "node:net";
import { CLIENT_CONTEXT_HEADER } from "./client-context.ts";
import { normalizeBdMobile } from "../shared/bd-phone.ts";
import { CAMPAIGN_CLICK_HEADER, CAMPAIGN_RECEIPT_HEADER } from './campaign-links.js';
import { ANALYTICS_SESSION_HEADER } from './analytics-session.js';

const MAX_MONEY = 10_000_000;
const CAPTURE_TIMEOUT_MS = 5_000;

const sourcePaths = {
  storefront: "/checkout",
  // Historical name kept on purpose: the Merchant Suite's abandoned_checkouts check constraint pairs
  // "kalojira_mixed" with this path, and the বড়ি and কাটিমন আম landings record carts under it.
  kalojira_mixed: "/step/kalojira-mixed",
  // The আমসত্ত্ব আচার landing has its own source so incomplete orders are labelled with it.
  am_sotto_achar: "/step/am-sotto-achar",
} as const;

const sourceSchema = z.enum([
  "storefront",
  "kalojira_mixed",
  "am_sotto_achar",
  "landing",
]);

// Any /step/<name> landing page captures as "landing" with its own address.
const LANDING_SOURCE_PATH_RE = /^\/step\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const boundedMoney = z.number()
  .finite()
  .min(0)
  .max(MAX_MONEY)
  .refine((value) => Math.round(value * 100) / 100 === value, "Amount supports at most two decimals");

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).optional();

const captureSchema = z.object({
  draftKey: z.string().trim().regex(UUID_RE, "Draft key must be a UUID"),
  source: sourceSchema,
  sourcePath: z.string().trim().min(1).max(120),
  customerName: optionalText(120),
  phone: z.string().trim().refine((phone) => normalizeBdMobile(phone) === phone, "Phone must be a valid Bangladeshi number"),
  address: optionalText(500),
  items: z.array(z.object({
    productName: z.string().trim().min(1).max(200),
    variantName: optionalText(160),
    quantity: z.number().int().min(1).max(100),
    unitPrice: boundedMoney,
  }).strict()).min(1).max(20),
  subtotal: boundedMoney,
  deliveryRate: boundedMoney,
  total: boundedMoney,
  campaign: z.object({
    utmSource: optionalText(120),
    utmMedium: optionalText(120),
    utmCampaign: optionalText(120),
    utmContent: optionalText(120),
    utmTerm: optionalText(120),
  }).strict().optional(),
}).strict().superRefine((capture, context) => {
  const validPath = capture.source === "landing"
    ? LANDING_SOURCE_PATH_RE.test(capture.sourcePath)
    : sourcePaths[capture.source] === capture.sourcePath;
  if (!validPath) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Source path does not match checkout source" });
  }
  if (Math.abs(capture.total - (capture.subtotal + capture.deliveryRate)) > 0.001) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Checkout total is inconsistent" });
  }
});

type CampaignKey = "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm";

export type AbandonedCartCapture = {
  draftKey: string;
  source: z.infer<typeof sourceSchema>;
  sourcePath: string;
  customerName?: string;
  phone: string;
  address?: string;
  items: Array<{
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  deliveryRate: number;
  total: number;
  campaign: Partial<Record<CampaignKey, string>>;
};

export class AbandonedCartValidationError extends Error {
  constructor() {
    super("Invalid abandoned cart capture");
    this.name = "AbandonedCartValidationError";
  }
}

export class AbandonedCartUpstreamError extends Error {
  constructor() {
    super("Merchant-Suite did not save the abandoned cart");
    this.name = "AbandonedCartUpstreamError";
  }
}

function omitBlank(value: string | undefined) {
  return value || undefined;
}

export function parseAbandonedCartCapture(body: unknown): AbandonedCartCapture {
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.hasOwn(body, 'campaignClickId')) {
    const clean = { ...body } as Record<string, unknown>; delete clean.campaignClickId; body = clean;
  }
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) throw new AbandonedCartValidationError();

  const campaign = Object.fromEntries(
    Object.entries(parsed.data.campaign ?? {}).filter(([, value]) => Boolean(value)),
  ) as AbandonedCartCapture["campaign"];

  return {
    ...parsed.data,
    draftKey: parsed.data.draftKey.toLowerCase(),
    customerName: omitBlank(parsed.data.customerName),
    address: omitBlank(parsed.data.address),
    items: parsed.data.items.map((item) => ({
      ...item,
      variantName: omitBlank(item.variantName),
    })),
    campaign,
  };
}

type AbandonedCartServiceDependencies = {
  fetchImpl?: typeof fetch;
  merchantSuiteUrl?: string;
  apiKey?: string;
  timeoutSignal?: () => AbortSignal;
  forwardedClientIp?: string;
  clientContextHeader?: string;
  campaignClickId?: string;
  campaignReceipt?: string;
  analyticsSessionId?: string;
};

export async function processAbandonedCartCapture(
  body: unknown,
  dependencies: AbandonedCartServiceDependencies = {},
) {
  const capture = parseAbandonedCartCapture(body);
  const merchantSuiteUrl = (dependencies.merchantSuiteUrl
    ?? (process.env.NODE_ENV === "production"
      ? "https://admin.serakhabar.com"
      : process.env.MERCHANT_SUITE_URL)
    ?? "").replace(/\/$/, "");
  const apiKey = dependencies.apiKey ?? process.env.CUSTOM_ORDERS_API_KEY ?? "";
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const forwardedClientIp = typeof dependencies.forwardedClientIp === "string"
    && isIP(dependencies.forwardedClientIp)
    ? dependencies.forwardedClientIp
    : undefined;

  try {
    if (!merchantSuiteUrl || !apiKey) throw new Error("Missing Merchant-Suite configuration");
    const response = await fetchImpl(`${merchantSuiteUrl}/api/custom-orders/abandoned-checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(forwardedClientIp ? { "x-storefront-client-ip": forwardedClientIp } : {}),
        ...(dependencies.clientContextHeader ? { [CLIENT_CONTEXT_HEADER]: dependencies.clientContextHeader } : {}),
        ...(dependencies.campaignClickId ? { [CAMPAIGN_CLICK_HEADER]: dependencies.campaignClickId } : {}),
        ...(dependencies.campaignReceipt ? { [CAMPAIGN_RECEIPT_HEADER]: dependencies.campaignReceipt } : {}),
        ...(dependencies.analyticsSessionId ? { [ANALYTICS_SESSION_HEADER]: dependencies.analyticsSessionId } : {}),
      },
      body: JSON.stringify(capture),
      signal: (dependencies.timeoutSignal ?? (() => AbortSignal.timeout(CAPTURE_TIMEOUT_MS)))(),
    });
    if (!response.ok) throw new Error("Merchant-Suite rejected abandoned cart capture");
  } catch {
    throw new AbandonedCartUpstreamError();
  }
}
