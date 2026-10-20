import assert from "node:assert/strict";
import test from "node:test";
import { readAmsottoConfirmation, saveAmsottoConfirmation, clearAmsottoConfirmation } from "./confirmation";
import { AMSOTTO_CONFIRMATION_KEY } from "./content";
import { LANDING_CONFIRMATION_KEY, readLandingOrderConfirmation, writeLandingOrderConfirmation } from "../landing/order";

const confirmation = { orderRef: "SK-LOCAL-TEST", productId: "product-id", productName: "আমসত্ত্ব আচার", variantLabel: "১ কেজি", quantity: 2, unitPrice: 700, subtotal: 1400, deliveryCharge: 100, total: 1500, customerName: "Test Preview", phone: "01712345678", address: "Test address only" };
test("confirmation survives denied session storage during SPA navigation", () => {
  const denied = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
  saveAmsottoConfirmation(confirmation, denied);
  assert.deepEqual(readAmsottoConfirmation(denied), confirmation);
  clearAmsottoConfirmation(denied);
  assert.equal(readAmsottoConfirmation(denied), null);
});
test("আমসত্ত্ব confirmation key does not overwrite other campaign receipts", () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
  const other = { ...confirmation, orderRef: "SK-OTHER" };
  writeLandingOrderConfirmation(storage, other);
  saveAmsottoConfirmation(confirmation, storage);
  assert.ok(entries.has(AMSOTTO_CONFIRMATION_KEY));
  assert.ok(entries.has(LANDING_CONFIRMATION_KEY));
  assert.equal(readAmsottoConfirmation(storage)?.orderRef, confirmation.orderRef);
  clearAmsottoConfirmation(storage);
  assert.equal(readAmsottoConfirmation(storage), null);
  assert.equal(readLandingOrderConfirmation(storage)?.orderRef, "SK-OTHER");
});
