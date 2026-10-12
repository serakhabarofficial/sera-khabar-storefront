import assert from "node:assert/strict";
import { test } from "node:test";
import { getMerchantSuiteTrackerUrl } from "./tracker.ts";

const storefrontId = "690aa8b3-6657-46c4-8df5-addcc1f96035";

test("does not inject a tracker from a free ngrok tunnel", () => {
  assert.equal(
    getMerchantSuiteTrackerUrl(
      "https://sulfite-steerable-purgatory.ngrok-free.dev",
      storefrontId,
    ),
    null,
  );
});

test("builds the tracker URL for a stable Merchant Suite origin", () => {
  assert.equal(
    getMerchantSuiteTrackerUrl("https://sera-khabar-commerceos.vercel.app/", storefrontId),
    `https://sera-khabar-commerceos.vercel.app/api/tracker.js?org=${storefrontId}`,
  );
});

test("does not inject a tracker for invalid configuration", () => {
  assert.equal(getMerchantSuiteTrackerUrl("", storefrontId), null);
  assert.equal(getMerchantSuiteTrackerUrl("not a url", storefrontId), null);
  assert.equal(getMerchantSuiteTrackerUrl("https://suite.example.com", ""), null);
});
