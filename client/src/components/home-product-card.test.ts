import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const homeSource = readFileSync(new URL("../pages/home.tsx", import.meta.url), "utf8");
const cardPath = new URL("./home-product-card.tsx", import.meta.url);
const cardSource = existsSync(cardPath) ? readFileSync(cardPath, "utf8") : "";
const productPageSource = readFileSync(new URL("../pages/product.tsx", import.meta.url), "utf8");

test("the homepage poster card reuses this card's variant and price logic", () => {
  const posterSource = readFileSync(new URL("./poster-product-card.tsx", import.meta.url), "utf8");
  assert.match(homeSource, /import PosterProductCard/);
  assert.match(posterSource, /import \{ formatCardAmount, getVariantLabel, selectDefaultVariant \} from "@\/components\/home-product-card"/);
  assert.match(posterSource, /product\.available === false \|\| fixedVariant\?\.available === false/);
  assert.match(posterSource, /!isSoldOut && Boolean\(productUuid\) && Boolean\(variantId\)/);
  assert.match(posterSource, /disabled=\{!canAddToCart\}/);
});

test("the shared card shows discounts and adds to cart", () => {
  assert.match(cardSource, /Save/);
  assert.match(cardSource, /compareAtPrice/);
  assert.match(cardSource, /Add to Cart/);
  assert.match(cardSource, /addToCart/);
});

test("the card cannot add an item checkout could not identify", () => {
  // The button is disabled when the product is unavailable and also when the
  // card cannot resolve the ids checkout needs, so it can never add an item
  // the Suite would reject.
  assert.match(cardSource, /disabled=\{!canAddToCart\}/);
  assert.match(cardSource, /product\.available !== false && Boolean\(productUuid\) && Boolean\(variantId\)/);
});

test("card prices the same variant the product page opens on", () => {
  // Both resolve the default through getDefaultBundleIndex over the in-stock
  // variants, so a card can never advertise one price and hand the customer
  // another when they land on the product page.
  assert.match(cardSource, /import \{ getDefaultBundleIndex \} from "@\/lib\/product-selection"/);
  assert.match(cardSource, /getDefaultBundleIndex\(product\.slug, inStock\.map\(\(variant\) => \(\{ title: getVariantLabel\(variant\) \}\)\)\)/);
  assert.match(productPageSource, /getDefaultBundleIndex\(slug, bundles\)/);
});
