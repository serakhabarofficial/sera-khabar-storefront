import assert from "node:assert/strict";
import { test } from "node:test";
import { GUR_COMBO_SLUG, GUR_DELIVERY_CHARGE, GUR_JHOLA_COMBO_SLUG, GUR_LANDINGS, gurDeliveryCharge } from "./content";

test("a memo holding only the combo ships free, in any quantity", () => {
  assert.equal(gurDeliveryCharge([GUR_COMBO_SLUG]), 0);
  assert.equal(gurDeliveryCharge([GUR_COMBO_SLUG, GUR_COMBO_SLUG]), 0);
});

test("the combo with any other গুড় pays the normal delivery charge", () => {
  assert.equal(gurDeliveryCharge([GUR_COMBO_SLUG, "round-patali-jaggery"]), GUR_DELIVERY_CHARGE);
  assert.equal(gurDeliveryCharge(["round-patali-jaggery"]), GUR_DELIVERY_CHARGE);
});

test("an empty memo shows the normal charge", () => {
  assert.equal(gurDeliveryCharge([]), GUR_DELIVERY_CHARGE);
});

test("the ৩ কেজি ঝোলা combo ships free alone or with the other combo", () => {
  assert.equal(gurDeliveryCharge([GUR_JHOLA_COMBO_SLUG]), 0);
  assert.equal(gurDeliveryCharge([GUR_COMBO_SLUG, GUR_JHOLA_COMBO_SLUG]), 0);
});

test("the ঝোলা combo with a non-combo গুড় pays the normal charge", () => {
  assert.equal(gurDeliveryCharge([GUR_JHOLA_COMBO_SLUG, "liquid-date-jaggery"]), GUR_DELIVERY_CHARGE);
});

test("only the combo landing sells the ঝোলা combo, below the পাঁচ রূপ combo", () => {
  assert.deepEqual(GUR_LANDINGS.combo.checkout, [GUR_COMBO_SLUG, GUR_JHOLA_COMBO_SLUG]);
  assert.ok(!GUR_LANDINGS.main.checkout.includes(GUR_JHOLA_COMBO_SLUG));
});
