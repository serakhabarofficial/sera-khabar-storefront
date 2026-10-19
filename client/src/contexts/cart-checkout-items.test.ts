import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// A cart row is only sellable if it carries the canonical product and variant
// ids: checkout posts them as the order's line items and the Suite rejects an
// order without them. That rejection reaches the customer as a bare
// "Could not confirm order", which is indistinguishable from an outage, so
// these assertions guard the whole chain from add-to-cart to the checkout body.
const cartContext = readFileSync(new URL("./cart-context.tsx", import.meta.url), "utf8");
const cartDrawer = readFileSync(new URL("../components/cart-drawer.tsx", import.meta.url), "utf8");
const homeProductCard = readFileSync(new URL("../components/home-product-card.tsx", import.meta.url), "utf8");
const productPage = readFileSync(new URL("../pages/product.tsx", import.meta.url), "utf8");

test("cart items require the ids checkout identifies them by", () => {
  assert.match(cartContext, /productUuid: string;/);
  assert.match(cartContext, /variantId: string;/);
  assert.doesNotMatch(cartContext, /productUuid\?: string/);
  assert.doesNotMatch(cartContext, /variantId\?: string/);
});

test("adding to the cart persists the ids instead of dropping them", () => {
  const storedItem = cartContext.slice(cartContext.indexOf("// Add new item"));
  assert.match(storedItem, /productUuid: product\.productUuid,/);
  assert.match(storedItem, /variantId: product\.variantId,/);
});

test("a stored cart without ids is dropped rather than left unsellable", () => {
  assert.match(cartContext, /function isOrderableCartItem/);
  assert.match(cartContext, /parsed\.filter\(isOrderableCartItem\)/);
});

test("cart checkout always sends line items", () => {
  assert.match(
    cartDrawer,
    /items: items\.map\(\(item\) => \(\{ productId: item\.productUuid, variantId: item\.variantId, quantity: item\.quantity \}\)\)/,
  );
  // The old guard silently sent no items when one was missing an id, which the
  // Suite rejected on every retry. Nothing may reintroduce that fallback.
  assert.doesNotMatch(cartDrawer, /items\.every\(/);
});

test("both add-to-cart entry points supply the ids", () => {
  assert.match(homeProductCard, /productUuid,\n\s+variantId,/);
  assert.match(productPage, /productUuid: canonicalProductId,\n\s+variantId: canonicalVariantId,/);
});

test("a product with no resolvable ids cannot be ordered", () => {
  assert.match(productPage, /const checkoutIdsResolved = Boolean\(canonicalProductId\) && Boolean\(canonicalVariantId\)/);
  assert.match(productPage, /const isUnavailable = .*!checkoutIdsResolved/);
});

test("adding to the cart shows a notice instead of opening the drawer", () => {
  const addToCartBody = cartContext.slice(cartContext.indexOf("const addToCart = useCallback(("));
  assert.doesNotMatch(addToCartBody, /setIsOpen\(true\)/);
  assert.match(addToCartBody, /setNotice\(\{/);
});

test("the cart exposes notice and dock-pulse controls", () => {
  assert.match(cartContext, /notice: CartNotice \| null;/);
  assert.match(cartContext, /dismissNotice: \(\) => void;/);
  assert.match(cartContext, /cartPulseKey: number;/);
  assert.match(cartContext, /signalCartPulse: \(\) => void;/);
  assert.match(cartContext, /consumeCartPulse: \(\) => void;/);
});
