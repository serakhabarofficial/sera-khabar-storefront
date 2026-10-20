import assert from "node:assert/strict";
import test from "node:test";
import { buildLandingOrderPayload } from "./order.ts";

test("Kalojira checkout refuses an arbitrary 11-digit phone", () => {
  assert.throws(() => buildLandingOrderPayload({ productName: "Honey", pack: { variantId: "v", label: "1 kg", unitPrice: 900 },
    quantity: 1, customerName: "Test Customer", phone: "12345678901", address: "House 1 Road 2 Dhaka" }));
});
import {
  LANDING_CONFIRMATION_KEY,
  buildLandingOrderConfirmation,
  buildLandingOrderPayload,
  calculateLandingOrder,
  getLandingPackOptions,
  readLandingOrderConfirmation,
  writeLandingOrderConfirmation,
} from "./order.ts";

const product = {
  slug: "kalojira-mixed",
  name: "কালোজিরা মিক্সড | Kalojira Mixed",
  available: true,
  variants: [
    { id: "v500", attributes: { size: "৫০০ গ্রাম" }, price: 990, stock_quantity: 100 },
    { id: "v1kg", attributes: { size: "১ কেজি" }, price: 1600, stock_quantity: 100 },
  ],
};

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("extracts live Kalojira pack labels and prices", () => {
  assert.deepEqual(getLandingPackOptions(product), [
    { variantId: "v500", label: "৫০০ গ্রাম", unitPrice: 990 },
    { variantId: "v1kg", label: "১ কেজি", unitPrice: 1600 },
  ]);
});

test("calculates Kalojira order totals with home delivery", () => {
  assert.deepEqual(calculateLandingOrder(1600, 1), {
    unitPrice: 1600,
    quantity: 1,
    subtotal: 1600,
    deliveryCharge: 0,
    total: 1600,
  });
});

test("builds COD payload and persists only safe confirmation data", () => {
  const payload = buildLandingOrderPayload({
    productName: product.name,
    pack: { variantId: "v1kg", label: "১ কেজি", unitPrice: 1600 },
    quantity: 1,
    customerName: "পরীক্ষা গ্রাহক",
    phone: "01712345678",
    address: "বাড়ি ১২ সাভার ঢাকা",
  });
  assert.equal(payload.paymentMethod, "cash_on_delivery");
  assert.equal("trackingMode" in payload, false);
  const storage = createMemoryStorage();
  assert.equal(writeLandingOrderConfirmation(storage, {
    orderRef: "ORD-123",
    productName: product.name,
    variantLabel: "১ কেজি",
    quantity: 1,
    unitPrice: 1600,
    subtotal: 1600,
    deliveryCharge: 0,
    total: 1600,
    customerName: "পরীক্ষা গ্রাহক",
    phone: "01712345678",
    address: "বাড়ি ১২ সাভার ঢাকা",
  }), true);
  assert.ok(storage.getItem(LANDING_CONFIRMATION_KEY));
  assert.equal(readLandingOrderConfirmation(storage)?.orderRef, "ORD-123");
});

test("confirmation keeps a paid delivery charge through to the thank-you page", () => {
  const payload = buildLandingOrderPayload({
    productName: "হোমমেড কুমড়ো বড়ি | Homemade Pumpkin Bori",
    pack: { variantId: "v1kg", label: "১ কেজি", unitPrice: 600 },
    quantity: 2,
    customerName: "পরীক্ষা গ্রাহক",
    phone: "01712345678",
    address: "বাড়ি ১২ সাভার ঢাকা",
    deliveryCharge: 100,
  });
  const confirmation = buildLandingOrderConfirmation("ORD-456", payload);
  assert.equal(confirmation.deliveryCharge, 100);
  assert.equal(confirmation.total, 1300);
  const storage = createMemoryStorage();
  assert.equal(writeLandingOrderConfirmation(storage, confirmation), true);
  const stored = readLandingOrderConfirmation(storage);
  assert.equal(stored?.deliveryCharge, 100);
  assert.equal(stored?.total, 1300);
});

test("confirmation reader rejects a total that does not match subtotal plus delivery", () => {
  const storage = createMemoryStorage();
  storage.setItem(LANDING_CONFIRMATION_KEY, JSON.stringify({
    orderRef: "ORD-789", productName: "Bori", variantLabel: "১ কেজি", quantity: 1, unitPrice: 600,
    subtotal: 600, deliveryCharge: 100, total: 600,
    customerName: "পরীক্ষা গ্রাহক", phone: "01712345678", address: "বাড়ি ১২ সাভার ঢাকা",
  }));
  assert.equal(readLandingOrderConfirmation(storage), null);
});

test("confirmation carries the catalog product id to the thank-you Purchase", () => {
  const payload = buildLandingOrderPayload({
    productName: "হোমমেড কুমড়ো বড়ি | Homemade Pumpkin Bori",
    pack: { variantId: "v1kg", label: "১ কেজি", unitPrice: 600 },
    quantity: 1,
    customerName: "পরীক্ষা গ্রাহক",
    phone: "01712345678",
    address: "বাড়ি ১২ সাভার ঢাকা",
  });
  const confirmation = buildLandingOrderConfirmation("ORD-789", { ...payload, items: [{ productId: "prod-bori" }] });
  assert.equal(confirmation.productId, "prod-bori");
  const storage = createMemoryStorage();
  assert.equal(writeLandingOrderConfirmation(storage, confirmation), true);
  assert.equal(readLandingOrderConfirmation(storage)?.productId, "prod-bori");
});
