// Sera Khabar's Meta Pixel. Public by design: the browser Pixel needs it. The Conversions API token is
// the secret half and lives only in the server-side META_CAPI_TOKEN environment variable.
export const META_PIXEL_ID = "1433713624268170";

// Neutral path: ad-block lists match names like "pixel", "meta" or "collect".
export const META_SIGNAL_PATH = "/api/storefront-signal";

// Events the browser may forward to the server. Purchase is deliberately absent: the order
// endpoint sends it once the Suite has saved the order, so a visitor cannot fake one.
export const META_BROWSER_EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout"] as const;
export type MetaBrowserEventName = (typeof META_BROWSER_EVENTS)[number];

/** Shared by the browser Pixel and the server Purchase, so Meta counts the order once. */
export function metaPurchaseEventId(orderRef: string) {
  return `purchase-${orderRef}`;
}
