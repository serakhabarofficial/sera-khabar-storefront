import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ABANDONED_CART_SOURCE_PATHS } from "../../lib/abandoned-cart-capture";
import { parseAbandonedCartCapture as parseApiCapture } from "../../../../api/abandoned-carts";
import { parseAbandonedCartCapture as parseServerCapture } from "../../../../server/abandoned-cart-service";

const capture = (source: string, sourcePath: string) => ({
  draftKey: "3f2b8c1e-5d4a-4b6f-9a2e-1c7d8e9f0a1b",
  source,
  sourcePath,
  phone: "01712345678",
  items: [{ productName: "আমসত্ত্ব আচার | Mango Leather Pickle", variantName: "৫০০ গ্রাম", quantity: 1, unitPrice: 350 }],
  subtotal: 350,
  deliveryRate: 100,
  total: 450,
});

test("the আমসত্ত্ব checkout records incomplete orders under its own page", () => {
  const checkout = readFileSync(new URL("./amsotto-checkout.tsx", import.meta.url), "utf8");
  assert.match(checkout, /useAbandonedCartCapture\("am_sotto_achar", "am_sotto_achar"\)/);
  assert.equal(ABANDONED_CART_SOURCE_PATHS.am_sotto_achar, "/step/am-sotto-achar");
});

test("the capture API and server accept am_sotto_achar only with its own path", () => {
  for (const parse of [parseApiCapture, parseServerCapture]) {
    assert.equal(parse(capture("am_sotto_achar", "/step/am-sotto-achar")).source, "am_sotto_achar");
    assert.throws(() => parse(capture("am_sotto_achar", "/step/kalojira-mixed")));
  }
});
