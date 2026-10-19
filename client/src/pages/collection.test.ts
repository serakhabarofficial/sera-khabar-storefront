import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const collectionSource = readFileSync(new URL("./collection.tsx", import.meta.url), "utf8");
const productsSource = readFileSync(new URL("./products.tsx", import.meta.url), "utf8");

test("loads the live catalog and filters it through the configured collection", () => {
  assert.match(collectionSource, /fetchStorefrontProducts/);
  assert.match(collectionSource, /getCollection\(params\.slug\)/);
  assert.match(collectionSource, /getProductsForCollection/);
  assert.match(collectionSource, /initialData: generatedStorefrontProducts/);
});

test("uses the complete ordered catalog for Top Selling Products", () => {
  assert.match(collectionSource, /getTopSellingProducts/);
  assert.match(collectionSource, /getTopSellingProducts\(products \?\? \[\]\)/);
});

test("renders the homepage's empty message", () => {
  assert.match(collectionSource, /নতুন পণ্য শীঘ্রই আসছে।/);
});

test("uses the homepage Stage cards with live stock merged in", () => {
  assert.match(collectionSource, /<div className="st">\s*<div className="st-frame">/);
  assert.match(collectionSource, /<div key=\{active\?\.label \?\? "all"\} className="st-row st-grid">/);
  assert.match(collectionSource, /<PosterProductCard\s+key=\{product\.id \|\| product\.slug\}\s+product=\{product\}\s+inventory=\{inventoryEntryFor\(inventory, product\)\}\s+look="stage"/);
  assert.doesNotMatch(collectionSource, /StorefrontProductCard/);
  assert.doesNotMatch(productsSource, /StorefrontProductCard/);
});

test("splits a collection with a homepage shelf into the same tabs", () => {
  assert.match(collectionSource, /HOMEPAGE_SHELVES\.find\(\(item\) => item\.slug === collection\.slug\)/);
  assert.match(collectionSource, /groupProductsByTabs\(filteredProducts, shelf\.tabs\)/);
});
