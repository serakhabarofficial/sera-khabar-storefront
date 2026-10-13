import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const productSource = readFileSync(new URL("./product.tsx", import.meta.url), "utf8");

// Since the 2026-10-13 redesign the recommendations use the homepage poster card.
test("uses the shared styled card for product-page recommendations", () => {
  assert.match(productSource, /import PosterProductCard, \{ splitProductName \} from "@\/components\/poster-product-card"/);
  assert.match(productSource, /relatedProducts\.map\(\(p\) => \(/);
  assert.match(productSource, /<PosterProductCard key=\{p\.slug\} product=\{p\} \/>/);
});
