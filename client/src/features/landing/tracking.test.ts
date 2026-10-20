import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { markLandingPurchaseTracked } from "./tracking.ts";

const campaignSources = [
  readFileSync(new URL("./tracking.ts", import.meta.url), "utf8"),
  readFileSync(new URL("./campaign-layout.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("./mobile-order-bar.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("./landing-checkout.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../../pages/landing-thank-you.tsx", import.meta.url), "utf8"),
];

test("the landing kit has no direct interaction tracker", () => {
  for (const source of campaignSources) {
    assert.doesNotMatch(source, /(?:trackLandingCampaignEvent|trackGoogleInteractionEvent)/);
  }
});

test("purchase markers allow one event per order reference", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  assert.equal(markLandingPurchaseTracked(storage, "ORD-123"), true);
  assert.equal(markLandingPurchaseTracked(storage, "ORD-123"), false);
});
