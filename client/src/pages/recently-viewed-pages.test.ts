import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const homeSource = readFileSync(new URL("./home.tsx", import.meta.url), "utf8");
const productsSource = readFileSync(new URL("./products.tsx", import.meta.url), "utf8");
// The all-products grid renders through this component; the card assertions
// below used to read products.tsx and silently broke when it was extracted.
const productCardSource = readFileSync(
  new URL("../components/storefront-product-card.tsx", import.meta.url),
  "utf8",
);

test("leaves Recently Viewed off the redesigned homepage", () => {
  // The approved 2026-10-13 homepage ends with the FAQ chat; Recently Viewed stays on product pages.
  assert.doesNotMatch(homeSource, /<RecentlyViewed/);
});

test("renders Recently Viewed on the all-products page without replacing its catalog", () => {
  assert.match(productsSource, /import RecentlyViewed from "@\/components\/recently-viewed"/);
  assert.match(productsSource, /<RecentlyViewed products=\{products \?\? generatedStorefrontProducts\} look="stage" \/>/);
  assert.match(productCardSource, /<HomeProductCard product=\{merged\}/);
  // Stock now arrives as a prop from the page's single batched inventory read.
  assert.match(productCardSource, /mergeInventory\(product, inventory\)/);
  assert.doesNotMatch(productCardSource, /useQuery/);
});
