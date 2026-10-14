import { z } from "zod";
import { OrderProtectionError, type OrderProcessResult } from "./order-protection-errors.ts";
import { normalizeLandingPagePath } from "./landing-page-attribution.ts";
import { CLIENT_CONTEXT_HEADER } from "./client-context.ts";
import { normalizeBdMobile } from "../shared/bd-phone.ts";
import { CAMPAIGN_CLICK_HEADER, CAMPAIGN_RECEIPT_HEADER } from './campaign-links.js';
import { ANALYTICS_SESSION_HEADER } from './analytics-session.js';

export { OrderProtectionError } from "./order-protection-errors.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const orderRequestSchema = z.object({
  bundleTitle: z.string().trim().min(1).max(200),
  bundleDetails: z.string().trim().min(1).max(300),
  bundlePrice: z.number().int().positive().max(10_000_000).refine(Number.isSafeInteger),
  quantity: z.number().int().min(1).max(100).refine(Number.isSafeInteger),
  deliveryCharge: z.number().int().min(0).max(100_000).refine(Number.isSafeInteger),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().transform(normalizeBdMobile).pipe(z.string()),
  address: z.string().trim().min(5).max(500),
  paymentMethod: z.enum(["cash_on_delivery", "bkash"]).default("cash_on_delivery"),
  bkashTrxId: z.string().trim().max(80).optional().default(""),
  draftKey: z.string().trim().regex(UUID_RE, "Draft key must be a UUID").transform((value) => value.toLowerCase()).optional(),
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
  clientSessionId: z.string().max(120).regex(/^[a-zA-Z0-9._:-]+$/).optional(),
  checkoutStartedAt: z.string().max(64).refine((value) => Number.isFinite(Date.parse(value)), "Invalid checkout timestamp").optional(),
  deviceFingerprint: z.string().regex(/^[0-9a-f]{64}$/).optional().catch(undefined),
  checkoutTelemetry: z.object({
    firstInteractionAt: z.string().max(64).refine((value) => Number.isFinite(Date.parse(value))).optional(),
    phoneCandidates: z.array(z.string().regex(/^\d{11}$/)).max(5).optional(),
    pastedFields: z.array(z.enum(["name", "phone", "address"])).max(3).optional(),
  }).strict().optional().catch(undefined),
  landingPagePath: z.string().trim().max(120).transform((value) => {
    const normalized = normalizeLandingPagePath(value);
    if (!normalized) throw new Error("Invalid landing page path");
    return normalized;
  }).optional(),
  // Required: the Suite rejects an order with no line items, and a rejection
  // reaches the customer as a bare "could not confirm order". Refusing the
  // payload here turns a silent checkout failure into a visible one.
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(120),
    variantId: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(100).refine(Number.isSafeInteger),
  })).min(1).max(50),
  shippingZoneId: z.string().trim().min(1).max(120).optional(),
}).refine(
  (order) => order.paymentMethod !== "bkash" || order.bkashTrxId.length > 0,
  {
    message: "bKash reference ID is required",
    path: ["bkashTrxId"],
  },
).refine(
  (order) => Number.isSafeInteger(order.bundlePrice + order.deliveryCharge),
  { message: "Order total is invalid" },
);

export type OrderRequest = z.infer<typeof orderRequestSchema>;

export class OrderUpstreamError extends Error {
  constructor(readonly statusCode: 429 | 502 = 502) {
    super("Merchant-Suite did not confirm the order");
    this.name = "OrderUpstreamError";
  }
}

type OrderServiceDependencies = {
  fetchImpl?: typeof fetch;
  merchantSuiteUrl?: string;
  storefrontHandle?: string;
  timeoutSignal?: () => AbortSignal;
  clientContextHeader?: string;
  campaignClickId?: string;
  campaignReceipt?: string;
  analyticsSessionId?: string;
};

function getCanonicalOrderRef(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export async function processOrder(order: OrderRequest, dependencies: OrderServiceDependencies = {}) {
  const configuredMerchantSuiteUrl = (dependencies.merchantSuiteUrl
    ?? (process.env.NODE_ENV === "production"
      ? "https://admin.serakhabar.com"
      : process.env.MERCHANT_SUITE_URL)
    ?? "").replace(/\/$/, "");
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  try {
    const storefrontHandle = (dependencies.storefrontHandle ?? process.env.STOREFRONT_HANDLE ?? "").trim();
    if (!configuredMerchantSuiteUrl || !storefrontHandle) throw new Error("Missing Merchant-Suite configuration");
    const response = await fetchImpl(`${configuredMerchantSuiteUrl}/api/public/v1/${encodeURIComponent(storefrontHandle)}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(dependencies.clientContextHeader ? { [CLIENT_CONTEXT_HEADER]: dependencies.clientContextHeader } : {}),
        ...(dependencies.campaignClickId ? { [CAMPAIGN_CLICK_HEADER]: dependencies.campaignClickId } : {}),
        ...(dependencies.campaignReceipt ? { [CAMPAIGN_RECEIPT_HEADER]: dependencies.campaignReceipt } : {}),
        ...(dependencies.analyticsSessionId ? { [ANALYTICS_SESSION_HEADER]: dependencies.analyticsSessionId } : {}),
      },
      body: JSON.stringify({
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        items: order.items,
        shippingZoneId: order.shippingZoneId,
        website: order.website,
        notes: `${order.bundleTitle} - ${order.bundleDetails}`,
        turnstileToken: order.turnstileToken,
        clientSessionId: order.clientSessionId,
        checkoutStartedAt: order.checkoutStartedAt,
        ...(order.landingPagePath ? { landingPagePath: order.landingPagePath } : {}),
        ...(order.draftKey ? { abandoned_checkout_draft_key: order.draftKey } : {}),
      }),
      signal: (dependencies.timeoutSignal ?? (() => AbortSignal.timeout(25_000)))(),
    });

    const data = await response.json().catch(() => ({})) as {
      order_id?: unknown;
      orderRef?: unknown;
      orderId?: unknown;
      decision?: unknown;
      review_id?: unknown;
      reviewId?: unknown;
      retryable?: unknown;
    };
    if (response.status === 202 && data.decision === "review") {
      const reviewId = getCanonicalOrderRef(data.reviewId ?? data.review_id);
      if (!reviewId) throw new Error("Missing review ID");
      return { decision: "review", reviewId };
    }
    if (response.status === 403 || data.decision === "block") {
      throw new OrderProtectionError("block", data.retryable === true, response.status || 403);
    }
    if (response.status === 429) throw new OrderUpstreamError(429);
    if (!response.ok) throw new Error(`Dashboard returned status ${response.status}`);
    const orderRef = getCanonicalOrderRef(data.orderRef ?? data.order_id ?? data.orderId);
    if (!orderRef) throw new Error("Missing canonical order ID");
    return { orderRef, decision: "allow" };
  } catch (error) {
    if (error instanceof OrderProtectionError || error instanceof OrderUpstreamError) throw error;
    throw new OrderUpstreamError();
  }
}
