import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const productSource = readFileSync(new URL("./product.tsx", import.meta.url), "utf8");

test("tracks resolved product views and renders the detail-page Recently Viewed section", () => {
  assert.match(productSource, /import RecentlyViewed from "@\/components\/recently-viewed"/);
  assert.match(productSource, /recordRecentlyViewedSlug\(window\.localStorage, product\.slug\)/);
  assert.match(productSource, /<RecentlyViewed products=\{relatedSource\} excludeSlug=\{product\?\.slug\} \/>/);
  assert.match(productSource, /আরও দেখুন/);
  assert.match(productSource, /<PosterProductCard key=\{p\.slug\} product=\{p\} \/>/);
});
