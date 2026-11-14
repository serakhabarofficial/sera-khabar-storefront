import assert from "node:assert/strict";
import { test } from "node:test";
import { GUR_COMBO_SLUG, GUR_DELIVERY_CHARGE, gurDeliveryCharge } from "./content";

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
