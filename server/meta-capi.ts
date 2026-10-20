import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { META_BROWSER_EVENTS, META_PIXEL_ID, metaPurchaseEventId, type MetaBrowserEventName } from "../shared/meta.js";
import { normalizeBdMobile } from "../shared/bd-phone.js";

const GRAPH_API_URL = `https://graph.facebook.com/v23.0/${META_PIXEL_ID}/events`;
const SEND_TIMEOUT_MS = 5_000;
const MAX_ITEMS = 50;

export type MetaContent = {
  id: string;
  quantity: number;
  item_price?: number;
  title?: string;
  category?: string;
  brand?: string;
};

export type MetaCustomData = {
  currency?: "BDT";
  value?: number;
  content_type?: "product";
  content_ids?: string[];
  contents?: MetaContent[];
  content_name?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
  shipping?: number;
};

type MetaUserData = {
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
  external_id?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  country?: string[];
};

export type MetaServerEvent = {
  event_name: MetaBrowserEventName | "Purchase";
  event_id: string;
  event_time: number;
  action_source: "website";
  event_source_url?: string;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
};

export type BrowserMetaEvent = {
  event_name: MetaBrowserEventName;
  event_id: string;
  event_source_url: string;
  custom_data?: MetaCustomData;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function readCookie(headers: IncomingHttpHeaders, name: string) {
  const part = headers.cookie?.split(";").find((entry) => entry.trim().startsWith(`${name}=`));
  if (!part) return undefined;
  try {
    return decodeURIComponent(part.trim().slice(name.length + 1)) || undefined;
  } catch {
    return undefined;
  }
}

function firstHeader(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim() || undefined;
}

/** _fbc from the Pixel's cookie, or built from an ad click's fbclid when the cookie is not set yet. */
function readFbc(headers: IncomingHttpHeaders, url: string | undefined) {
  const cookie = readCookie(headers, "_fbc");
  if (cookie) return cookie;
  try {
    const fbclid = url ? new URL(url).searchParams.get("fbclid") : null;
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

export function buildMetaUserData(
  headers: IncomingHttpHeaders,
  options: { eventSourceUrl?: string; deviceId?: string; customer?: { name: string; phone: string } },
): MetaUserData {
  const userData: MetaUserData = {
    client_ip_address: firstHeader(headers["x-vercel-forwarded-for"])
      ?? firstHeader(headers["x-forwarded-for"]) ?? firstHeader(headers["x-real-ip"]),
    client_user_agent: firstHeader(headers["user-agent"]),
    fbp: readCookie(headers, "_fbp"),
    fbc: readFbc(headers, options.eventSourceUrl),
    external_id: options.deviceId ? [sha256(options.deviceId)] : undefined,
    country: [sha256("bd")],
  };

  if (options.customer) {
    // Meta wants the international form without "+": 01712345678 -> 8801712345678.
    const phone = normalizeBdMobile(options.customer.phone);
    if (phone) userData.ph = [sha256(`88${phone}`)];
    const [firstName, ...rest] = options.customer.name.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (firstName) userData.fn = [sha256(firstName)];
    if (rest.length) userData.ln = [sha256(rest.join(" "))];
  }

  return Object.fromEntries(Object.entries(userData).filter(([, value]) => value !== undefined)) as MetaUserData;
}

const boundedString = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() && value.length <= max ? value.trim() : undefined;
const boundedNumber = (value: unknown, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;

function sanitizeContent(value: unknown): MetaContent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = boundedString(raw.id, 120);
  const quantity = boundedNumber(raw.quantity, 1000);
  if (!id || !quantity || !Number.isSafeInteger(quantity)) return null;
  const content: MetaContent = { id, quantity };
  const itemPrice = boundedNumber(raw.item_price, 10_000_000);
  if (itemPrice !== undefined) content.item_price = itemPrice;
  const title = boundedString(raw.title, 200);
  if (title) content.title = title;
  const category = boundedString(raw.category, 120);
  if (category) content.category = category;
  const brand = boundedString(raw.brand, 60);
  if (brand) content.brand = brand;
  return content;
}

/** Keeps only the ecommerce fields Meta reads; anything else a browser sends is dropped. */
function sanitizeCustomData(value: unknown): MetaCustomData | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const data: MetaCustomData = {};
  const amount = boundedNumber(raw.value, 10_000_000);
  if (amount !== undefined) {
    data.value = amount;
    data.currency = "BDT";
  }
  if (raw.content_type === "product") data.content_type = "product";
  if (Array.isArray(raw.content_ids)) {
    const ids = raw.content_ids.slice(0, MAX_ITEMS).map((id) => boundedString(id, 120)).filter((id): id is string => Boolean(id));
    if (ids.length) data.content_ids = ids;
  }
  if (Array.isArray(raw.contents)) {
    const contents = raw.contents.slice(0, MAX_ITEMS).map(sanitizeContent).filter((content): content is MetaContent => Boolean(content));
    if (contents.length) data.contents = contents;
  }
  const contentName = boundedString(raw.content_name, 200);
  if (contentName) data.content_name = contentName;
  const contentCategory = boundedString(raw.content_category, 120);
  if (contentCategory) data.content_category = contentCategory;
  const numItems = boundedNumber(raw.num_items, 10_000);
  if (numItems && Number.isSafeInteger(numItems)) data.num_items = numItems;
  return Object.keys(data).length ? data : undefined;
}

/**
 * Validates an event the storefront page forwarded. The page URL must be on the host that received the
 * request, so another site cannot post events into this Pixel through the endpoint.
 */
export function parseBrowserMetaEvent(body: unknown, requestHost: string | undefined): BrowserMetaEvent | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const eventName = META_BROWSER_EVENTS.find((name) => name === raw.event_name);
  const eventId = typeof raw.event_id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(raw.event_id) ? raw.event_id : null;
  const eventSourceUrl = boundedString(raw.event_source_url, 2048);
  if (!eventName || !eventId || !eventSourceUrl || !requestHost) return null;
  try {
    const url = new URL(eventSourceUrl);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.host !== requestHost) return null;
  } catch {
    return null;
  }
  const customData = sanitizeCustomData(raw.custom_data);
  return {
    event_name: eventName,
    event_id: eventId,
    event_source_url: eventSourceUrl,
    ...(customData ? { custom_data: customData } : {}),
  };
}

export function buildBrowserServerEvent(event: BrowserMetaEvent, headers: IncomingHttpHeaders, deviceId: string): MetaServerEvent {
  return {
    ...event,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: buildMetaUserData(headers, { eventSourceUrl: event.event_source_url, deviceId }),
  };
}

type PurchaseOrder = {
  bundleTitle: string;
  bundlePrice: number;
  deliveryCharge: number;
  customerName: string;
  phone: string;
  items: Array<{ productId: string; quantity: number }>;
};

/** Built from the order the Suite just accepted; the browser sends its copy with the same event_id. */
export function buildPurchaseEvent(order: PurchaseOrder, orderRef: string, headers: IncomingHttpHeaders, deviceId: string): MetaServerEvent {
  const eventSourceUrl = firstHeader(headers.referer);
  return {
    event_name: "Purchase",
    event_id: metaPurchaseEventId(orderRef),
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
    user_data: buildMetaUserData(headers, {
      eventSourceUrl,
      deviceId,
      customer: { name: order.customerName, phone: order.phone },
    }),
    custom_data: {
      currency: "BDT",
      value: order.bundlePrice + order.deliveryCharge,
      content_type: "product",
      content_ids: order.items.map((item) => item.productId),
      contents: order.items.map((item) => ({ id: item.productId, quantity: item.quantity })),
      content_name: order.bundleTitle,
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      order_id: orderRef,
      shipping: order.deliveryCharge,
    },
  };
}

type SendOptions = { fetchImpl?: typeof fetch; token?: string; testEventCode?: string };

/** Posts to the Conversions API. Never throws: tracking must not break a page or a checkout. */
export async function sendMetaEvents(events: MetaServerEvent[], options: SendOptions = {}) {
  const token = options.token ?? process.env.META_CAPI_TOKEN;
  if (!token || !events.length) return { ok: false as const, skipped: true as const };
  const testEventCode = options.testEventCode ?? process.env.META_TEST_EVENT_CODE;
  const body = JSON.stringify({
    data: events,
    access_token: token,
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  });
  const fetchImpl = options.fetchImpl ?? fetch;

  // One retry for a network error or a Meta 5xx; a 4xx means the event itself is wrong.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchImpl(GRAPH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (response.ok) return { ok: true as const };
      const detail = await response.text().catch(() => "");
      console.warn(`[Meta CAPI] ${events.map((event) => event.event_name).join(",")} rejected: ${response.status} ${detail.slice(0, 300)}`);
      if (response.status < 500) return { ok: false as const, status: response.status };
    } catch {
      console.warn(`[Meta CAPI] ${events.map((event) => event.event_name).join(",")} send failed (attempt ${attempt})`);
    }
  }
  return { ok: false as const };
}
