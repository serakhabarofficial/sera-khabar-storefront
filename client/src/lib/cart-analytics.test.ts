import assert from "node:assert/strict";
import { test } from "node:test";
import { cartItemsValue, cartLineAnalyticsItem, quantityChangeEvent } from "./cart-analytics.ts";
import { toGoogleAnalyticsItem } from "./google-analytics.ts";

const line = { productId: 7, title: "দানাদার গুড়", size: "১ কেজি", price: "৳560" };

test("a bag row keeps its real product metadata at the given quantity", () => {
  const analyticsItem = toGoogleAnalyticsItem({ id: "variant-uuid", name: "দানাদার গুড়", variant: "১ কেজি", price: 560, quantity: 1 });
  assert.deepEqual(cartLineAnalyticsItem({ ...line, analyticsItem }, 3), { ...analyticsItem, quantity: 3 });
});

test("a bag row without metadata falls back to its own id, title, size and price", () => {
  const item = cartLineAnalyticsItem(line, 2);
  assert.equal(item.item_id, "7");
  assert.equal(item.item_name, "দানাদার গুড়");
  assert.equal(item.item_variant, "১ কেজি");
  assert.equal(item.item_brand, "Sera Khabar");
  assert.equal(item.price, 560);
  assert.equal(item.quantity, 2);
});

test("the value is every item's price times its quantity", () => {
  assert.equal(cartItemsValue([cartLineAnalyticsItem(line, 2), cartLineAnalyticsItem({ ...line, price: "৳470" }, 1)]), 1590);
  assert.equal(cartItemsValue([]), 0);
});

test("a bag quantity change sends add_to_cart or remove_from_cart for the units that changed", () => {
  assert.deepEqual(quantityChangeEvent(2, 3), { event: "add_to_cart", quantity: 1 });
  assert.deepEqual(quantityChangeEvent(3, 2), { event: "remove_from_cart", quantity: 1 });
  assert.deepEqual(quantityChangeEvent(1, 0), { event: "remove_from_cart", quantity: 1 });
  assert.equal(quantityChangeEvent(2, 2), null);
});
