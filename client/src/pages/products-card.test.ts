import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const productsSource = readFileSync(new URL("./products.tsx", import.meta.url), "utf8");
const posterCardSource = readFileSync(new URL("../components/poster-product-card.tsx", import.meta.url), "utf8");

test("uses the homepage Stage card for the all-products catalog", () => {
  assert.match(productsSource, /<div className="st">\s*<div className="st-frame">/);
  assert.match(productsSource, /<div key=\{active\?\.slug \|\| "all"\} className="st-row st-grid">/);
  assert.match(productsSource, /import PosterProductCard from "@\/components\/poster-product-card"/);
  assert.match(productsSource, /<PosterProductCard\s+key=\{product\.id \|\| product\.slug\}\s+product=\{product\}\s+inventory=\{inventoryEntryFor\(inventory, product\)\}\s+look="stage"/);
  assert.doesNotMatch(productsSource, /StorefrontProductCard/);
  assert.match(posterCardSource, /mergeInventory\(catalogProduct, inventory\)/);
});

test("offers the homepage category chips, but not on search results", () => {
  assert.match(productsSource, /const chips = searchQuery\s*\? \[\]/);
  assert.match(productsSource, /HOMEPAGE_CATEGORIES\.map/);
});
