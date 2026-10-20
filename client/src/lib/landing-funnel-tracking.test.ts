import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Landing-page checkouts must report the same funnel steps to Merchant Suite
// as the order dialog, or their orders never show as checkout/purchase visits.
const checkouts = [
  "../features/landing/landing-checkout.tsx",
];

for (const path of checkouts) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");

  test(`${path} reports checkout once when the shopper starts the form`, () => {
    assert.match(source, /beganCheckoutRef\.current = true;\s*trackMerchantSuiteEvent\("checkout"\);/);
  });

  test(`${path} reports purchase only for a confirmed order`, () => {
    assert.match(source, /trackMerchantSuiteEvent\("purchased"\);\s*setLocation\(/);
  });
}
