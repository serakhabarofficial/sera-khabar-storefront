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

test("uses the homepage poster cards with live stock merged in", () => {
  assert.match(collectionSource, /<div className="sk">/);
  assert.match(collectionSource, /<PosterProductCard key=\{product\.id \|\| product\.slug\} product=\{product\} \/>/);
  assert.match(collectionSource, /mergeInventory\(product, inventoryEntryFor\(inventory, product\)\)/);
  assert.doesNotMatch(collectionSource, /StorefrontProductCard/);
  assert.match(productsSource, /StorefrontProductCard/);
});

test("splits a collection with a homepage shelf into the same tabs", () => {
  assert.match(collectionSource, /HOMEPAGE_SHELVES\.find\(\(item\) => item\.slug === collection\.slug\)/);
  assert.match(collectionSource, /groupProductsByTabs\(filteredProducts, shelf\.tabs\)/);
});
