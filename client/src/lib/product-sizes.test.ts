import assert from "node:assert/strict";
import { test } from "node:test";

import { getSizeOffers, parsePackGrams } from "./product-sizes";

test("reads pack weights in Bangla or English digits", () => {
  assert.equal(parsePackGrams("১ কেজি"), 1000);
  assert.equal(parsePackGrams("২ কেজি"), 2000);
  assert.equal(parsePackGrams("৫০০ গ্রাম"), 500);
  assert.equal(parsePackGrams("1.5 kg"), 1500);
  assert.equal(parsePackGrams("250g"), 250);
  assert.equal(parsePackGrams("Default"), null);
});

test("shows per-kg prices and only real savings against the smallest pack", () => {
  const offers = getSizeOffers([
    { title: "১ কেজি", amount: 700 },
    { title: "২ কেজি", amount: 1300 },
  ]);
  assert.deepEqual(offers, [
    { perKg: 700, saving: 0 },
    { perKg: 650, saving: 100 },
  ]);
});

test("never invents a saving when a bigger pack costs more per kg or weights are unknown", () => {
  assert.deepEqual(getSizeOffers([{ title: "৫০০ গ্রাম", amount: 350 }, { title: "১ কেজি", amount: 720 }]), [
    { perKg: 700, saving: 0 },
    { perKg: 720, saving: 0 },
  ]);
  assert.deepEqual(getSizeOffers([{ title: "Default", amount: 300 }]), [{ perKg: null, saving: 0 }]);
});
