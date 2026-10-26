import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const productPage = readFileSync(new URL("./product.tsx", import.meta.url), "utf8");
const homeProductCard = readFileSync(new URL("../components/home-product-card.tsx", import.meta.url), "utf8");
const cartContext = readFileSync(new URL("../contexts/cart-context.tsx", import.meta.url), "utf8");
const cartDrawer = readFileSync(new URL("../components/cart-drawer.tsx", import.meta.url), "utf8");
const orderDialog = readFileSync(new URL("../components/order-dialog.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const googleAnalytics = readFileSync(new URL("../lib/google-analytics.ts", import.meta.url), "utf8");
const campaignCheckouts = [
  readFileSync(new URL("../features/landing/landing-checkout.tsx", import.meta.url), "utf8"),
];
const campaignThankYouPages = [
  readFileSync(new URL("./landing-thank-you.tsx", import.meta.url), "utf8"),
];

test("product page sends view_item and direct checkout item metadata", () => {
  assert.match(productPage, /trackGoogleEcommerceEvent\("view_item"/);
  assert.match(productPage, /analyticsItems: \[\{ \.\.\.productAnalyticsItem, quantity \}\]/);
});

test("cart add sends add_to_cart with selected variant metadata", () => {
  assert.match(cartContext, /trackGoogleEcommerceEvent\("add_to_cart"/);
  assert.match(cartContext, /analyticsItem\?: GoogleAnalyticsItem/);
});

test("opening the bag sends view_cart with every row", () => {
  assert.match(cartContext, /trackCartEvent\("view_cart", itemsRef\.current\.map\(\(line\) => cartLineAnalyticsItem\(line, line\.quantity\)\)\)/);
  assert.match(cartContext, /if \(!isOpen \|\| itemsRef\.current\.length === 0\) return;/);
});

test("the bag's Remove, minus and plus send remove_from_cart and add_to_cart", () => {
  const remove = cartContext.slice(cartContext.indexOf("const removeFromCart"), cartContext.indexOf("const updateQuantity"));
  assert.match(remove, /trackCartEvent\("remove_from_cart", \[cartLineAnalyticsItem\(line, line\.quantity\)\]\)/);
  const update = cartContext.slice(cartContext.indexOf("const updateQuantity"), cartContext.indexOf("const swapVariant"));
  assert.match(update, /removeFromCart\(itemId\);/);
  assert.match(update, /quantityChangeEvent\(line\.quantity, next\)/);
  assert.match(update, /trackCartEvent\(change\.event, \[cartLineAnalyticsItem\(line, change\.quantity\)\]\)/);
  // Emptying the bag after an order and switching sizes are not removals.
  for (const name of ["const swapVariant", "const clearCart"]) {
    const start = cartContext.indexOf(name);
    assert.doesNotMatch(cartContext.slice(start, cartContext.indexOf("};", start)), /trackCartEvent/);
  }
});

test("homepage add to cart passes real product metadata into cart analytics", () => {
  assert.match(homeProductCard, /toGoogleAnalyticsItem/);
  assert.match(homeProductCard, /analyticsItem: toGoogleAnalyticsItem\(\{/);
  assert.match(homeProductCard, /id: product\.id \?\? product\.slug/);
});

test("cart checkout preserves every item for checkout and purchase analytics", () => {
  assert.match(cartDrawer, /analyticsItems: items\.map/);
  assert.match(cartDrawer, /toGoogleAnalyticsItem/);
});

test("order dialog sends begin_checkout and purchase after a successful order", () => {
  assert.match(orderDialog, /trackGoogleEcommerceEvent\("begin_checkout"/);
  assert.match(orderDialog, /trackGoogleEcommerceEvent\("purchase"/);
  assert.match(orderDialog, /transactionId: result\.orderRef,/);
  assert.doesNotMatch(orderDialog, /result\.order_id/);
});

test("Meta ecommerce events come only from the shared dataLayer helper", () => {
  // Callers keep using trackGoogleEcommerceEvent; it mirrors each event to the Meta Pixel and the
  // Conversions API, so no page wires Meta on its own. App.tsx only sends the per-route PageView.
  for (const source of [productPage, cartContext, orderDialog, ...campaignCheckouts, ...campaignThankYouPages]) {
    assert.doesNotMatch(source, /(?:@\/lib\/meta-pixel|fbq|trackMetaEcommerceEvent)/);
  }
  assert.match(app, /trackMetaPageView\(\);/);
  assert.match(googleAnalytics, /trackMetaEcommerceEvent\(payload\)/);
  assert.equal(existsSync(new URL("../lib/meta.ts", import.meta.url)), false);
});

test("direct checkout analytics preserve selected quantity and unit price", () => {
  assert.match(productPage, /analyticsItems: \[\{ \.\.\.productAnalyticsItem, quantity \}\]/);
  assert.match(orderDialog, /const bundleQuantity = bundle\?\.quantity \?\? 1/);
  assert.match(orderDialog, /price: bundle\.unitPrice \?\? bundle\.price \/ \(bundle\.quantity \?\? 1\)/);
  assert.match(orderDialog, /quantity: bundle\.quantity \?\? 1/);
});

test("all campaign landing pages send ecommerce view, checkout, selection, and purchase events", () => {
  for (const checkout of campaignCheckouts) {
    assert.match(checkout, /trackGoogleEcommerceEvent\("view_item"/);
    assert.match(checkout, /trackGoogleEcommerceEvent\("begin_checkout"/);
    assert.match(checkout, /trackGoogleEcommerceEvent\("select_item"/);
  }

  for (const thankYouPage of campaignThankYouPages) {
    assert.match(thankYouPage, /trackGoogleEcommerceEvent\("purchase"/);
    assert.match(thankYouPage, /customer: \{/);
    assert.match(thankYouPage, /transactionId: confirmation\.orderRef/);
  }
});
