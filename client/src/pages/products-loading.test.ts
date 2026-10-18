import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const productsSource = readFileSync(new URL("./products.tsx", import.meta.url), "utf8");
const gridSource = readFileSync(new URL("../components/product-grid.tsx", import.meta.url), "utf8");
const storefrontProductsSource = readFileSync(new URL("../lib/storefront-products.ts", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("./home.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../components/layout.tsx", import.meta.url), "utf8");
const productSource = readFileSync(new URL("./product.tsx", import.meta.url), "utf8");

test("renders generated products before the live catalog request completes", () => {
  assert.match(productsSource, /generatedStorefrontProducts/);
  assert.match(productsSource, /initialData: generatedStorefrontProducts/);
  assert.match(productsSource, /initialDataUpdatedAt: 0/);
  // The error message only replaces the grid when there is nothing at all to show.
  assert.match(productsSource, /visibleProducts\.length > 0 \?[\s\S]*\{isError\s*\? "এই মুহূর্তে পণ্য দেখানো যাচ্ছে না।/);
});

test("renders a bilingual All Products title", () => {
  assert.match(productsSource, /<SkewReveal as="h1">সকল পণ্য<\/SkewReveal>/);
  assert.match(productsSource, /<SkewReveal className="script sub">All Products<\/SkewReveal>/);
});

test("keeps the shared product grid visible when background revalidation fails", () => {
  assert.match(gridSource, /generatedStorefrontProducts/);
  assert.match(gridSource, /initialData: generatedStorefrontProducts/);
  assert.match(gridSource, /isError && products\.length === 0/);
});

test("revalidates the live catalog instead of trusting the build snapshot", () => {
  assert.match(storefrontProductsSource, /STOREFRONT_CATALOG_QUERY_OPTIONS/);
  assert.match(storefrontProductsSource, /staleTime: 0/);
  assert.match(storefrontProductsSource, /refetchOnMount: "always"/);

  for (const source of [homeSource, productsSource, gridSource, layoutSource, productSource]) {
    assert.match(source, /\.\.\.STOREFRONT_CATALOG_QUERY_OPTIONS/);
  }
});
