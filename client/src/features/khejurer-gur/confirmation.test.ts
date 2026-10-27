import assert from "node:assert/strict";
import test from "node:test";
import { parseGurConfirmation } from "./confirmation";

const receipt = {
  orderRef: "SK-1042",
  items: [
    { productId: "p1", productName: "খেজুরের ঝোলা গুড়", variantLabel: "৫০০ গ্রাম", quantity: 2, unitPrice: 380 },
    { productId: "p3", productName: "খেজুরের পাটালী গুড়", variantLabel: "১ কেজি", quantity: 1, unitPrice: 671 },
  ],
  subtotal: 1431,
  deliveryCharge: 100,
  total: 1531,
  customerName: "রহিম উদ্দিন",
  phone: "01712345678",
  address: "নওহাটা, পবা, রাজশাহী",
};

test("a multi-গুড় receipt round-trips", () => {
  assert.deepEqual(parseGurConfirmation(JSON.parse(JSON.stringify(receipt))), receipt);
});

test("a tampered receipt is refused", () => {
  assert.equal(parseGurConfirmation({ ...receipt, total: 99 }), null);
  assert.equal(parseGurConfirmation({ ...receipt, subtotal: 1, total: 101 }), null);
  assert.equal(parseGurConfirmation({ ...receipt, items: [] }), null);
  assert.equal(parseGurConfirmation({ ...receipt, items: [{ ...receipt.items[0], quantity: -1 }] }), null);
  assert.equal(parseGurConfirmation(null), null);
});
