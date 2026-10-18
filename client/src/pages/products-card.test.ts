import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const productsSource = readFileSync(new URL("./products.tsx", import.meta.url), "utf8");
const posterCardSource = readFileSync(new URL("../components/poster-product-card.tsx", import.meta.url), "utf8");

test("uses the homepage poster card for the all-products catalog", () => {
  assert.match(productsSource, /<div className="sk">/);
  assert.match(productsSource, /import PosterProductCard from "@\/components\/poster-product-card"/);
  assert.match(productsSource, /<PosterProductCard\s+key=\{product\.id \|\| product\.slug\}\s+product=\{product\}\s+inventory=\{inventoryEntryFor\(inventory, product\)\}/);
  assert.doesNotMatch(productsSource, /StorefrontProductCard/);
  assert.match(posterCardSource, /mergeInventory\(catalogProduct, inventory\)/);
});

test("offers the homepage category chips, but not on search results", () => {
  assert.match(productsSource, /const chips = searchQuery\s*\? \[\]/);
  assert.match(productsSource, /HOMEPAGE_CATEGORIES\.map/);
});
