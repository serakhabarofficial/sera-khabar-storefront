import assert from "node:assert/strict";
import { test } from "node:test";
import { merchantSuiteTrackerTags } from "./vite-plugin-merchant-suite-tracker.ts";

const storefrontId = "11111111-1111-4111-8111-111111111111";

test("production builds load the tracker from the document head", () => {
  assert.deepEqual(merchantSuiteTrackerTags({ isProduction: true, env: { VITE_STOREFRONT_ID: storefrontId } }), [{
    tag: "script",
    attrs: { id: "merchant-suite-tracker", async: true, src: `https://sera-khabar-commerceos.vercel.app/api/tracker.js?org=${storefrontId}` },
    injectTo: "head",
  }]);
});

test("development builds use the configured Merchant Suite", () => {
  const [tag] = merchantSuiteTrackerTags({ isProduction: false, env: { VITE_MERCHANT_SUITE_URL: "http://localhost:5050", VITE_STOREFRONT_ID: storefrontId } });
  assert.equal(tag.attrs.src, `http://localhost:5050/api/tracker.js?org=${storefrontId}`);
});

test("no tracker is injected without a storefront id", () => {
  assert.deepEqual(merchantSuiteTrackerTags({ isProduction: true, env: {} }), []);
});
