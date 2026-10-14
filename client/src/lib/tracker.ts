export const PRODUCTION_MERCHANT_SUITE_URL = "https://admin.serakhabar.com";

const FREE_NGROK_HOST = /\.ngrok-free\.(?:app|dev)$/i;

export function getMerchantSuiteTrackerUrl(
  merchantSuiteUrl: string,
  storefrontId: string,
) {
  if (!merchantSuiteUrl || !storefrontId) return null;

  try {
    const suiteOrigin = new URL(merchantSuiteUrl);

    // A script element cannot send ngrok-skip-browser-warning. Free ngrok
    // tunnels therefore return an HTML interstitial to Safari, which Safari
    // attempts to parse as JavaScript. Keep analytics optional until the Suite
    // is available on a stable origin.
    if (FREE_NGROK_HOST.test(suiteOrigin.hostname)) return null;

    return new URL(
      `/api/tracker.js?org=${encodeURIComponent(storefrontId)}`,
      suiteOrigin,
    ).toString();
  } catch {
    return null;
  }
}
