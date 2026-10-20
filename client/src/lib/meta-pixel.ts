import { META_SIGNAL_PATH, metaPurchaseEventId, type MetaBrowserEventName } from "@shared/meta";
import type { GoogleEcommercePayload } from "./google-analytics";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MetaEventName = MetaBrowserEventName | "Purchase";

const ECOMMERCE_TO_META: Partial<Record<GoogleEcommercePayload["event"], MetaEventName>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

function createEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Hands the event to the server, which forwards it to the Conversions API. Survives page unloads. */
function sendToServer(body: object) {
  const json = JSON.stringify(body);
  try {
    if (navigator.sendBeacon?.(META_SIGNAL_PATH, new Blob([json], { type: "application/json" }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch(META_SIGNAL_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true })
    .catch(() => {});
}

/**
 * Sends one event twice with the same event_id: from the browser Pixel, and through our server to the
 * Conversions API. Meta keeps one. Purchase skips the server hop because the order endpoint already
 * sent it, with the customer's hashed details, the moment the order was saved.
 */
function trackMetaEvent(name: MetaEventName, customData: object | undefined, eventId: string) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", name, customData ?? {}, { eventID: eventId });
  if (name !== "Purchase") {
    sendToServer({ event_name: name, event_id: eventId, event_source_url: window.location.href, custom_data: customData });
  }
}

export function trackMetaPageView() {
  trackMetaEvent("PageView", undefined, createEventId());
}

/** Mirrors a dataLayer ecommerce event to Meta. Returns the event_id, or null when Meta has no match. */
export function trackMetaEcommerceEvent(payload: GoogleEcommercePayload) {
  const name = ECOMMERCE_TO_META[payload.event];
  if (!name || typeof window === "undefined") return null;

  const { ecommerce } = payload;
  if (name === "Purchase" && !ecommerce.transaction_id) return null;
  const items = ecommerce.items;
  const customData = {
    currency: "BDT",
    value: ecommerce.value,
    content_type: "product",
    content_ids: items.map((item) => item.item_id),
    contents: items.map((item) => ({
      id: item.item_id,
      quantity: item.quantity,
      item_price: item.price,
      title: item.item_name,
      ...(item.item_category ? { category: item.item_category } : {}),
      brand: item.item_brand,
    })),
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    ...(items.length === 1 ? { content_name: items[0].item_name } : {}),
    ...(items[0]?.item_category ? { content_category: items[0].item_category } : {}),
    ...(name === "Purchase"
      ? { order_id: ecommerce.transaction_id, shipping: ecommerce.shipping, ...(ecommerce.coupon ? { coupon: ecommerce.coupon } : {}) }
      : {}),
  };
  const eventId = name === "Purchase" ? metaPurchaseEventId(ecommerce.transaction_id) : createEventId();
  trackMetaEvent(name, customData, eventId);
  return eventId;
}

/** The Pixel's browser and click cookies, for the dataLayer copy of each event. */
export function readMetaCookies(cookie: string | undefined) {
  const read = (name: string) => cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  const fbp = read("_fbp");
  const fbc = read("_fbc");
  return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}
