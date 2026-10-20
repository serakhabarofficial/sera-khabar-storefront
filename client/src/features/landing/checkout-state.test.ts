import assert from "node:assert/strict";
import test from "node:test";
import { getLandingFocusTargetId, resolveLandingCheckoutStatus } from "./checkout-state.ts";

test("live product errors block stale checkout data", () => {
  assert.equal(resolveLandingCheckoutStatus({
    hasProduct: true,
    hasOrderablePacks: true,
    productIsPending: false,
    productIsError: true,
    inventoryIsError: false,
    inventoryIsFetched: true,
    hasInventory: true,
  }), "error");
});

test("a transient inventory sync gap keeps a sellable catalog available", () => {
  assert.equal(resolveLandingCheckoutStatus({
    hasProduct: true,
    hasOrderablePacks: true,
    productIsPending: false,
    productIsError: false,
    inventoryIsError: true,
    inventoryIsFetched: true,
    hasInventory: false,
  }), "ready");

  assert.equal(resolveLandingCheckoutStatus({
    hasProduct: true,
    hasOrderablePacks: true,
    productIsPending: false,
    productIsError: false,
    inventoryIsError: false,
    inventoryIsFetched: true,
    hasInventory: false,
  }), "ready");
});

test("focus target follows the checkout DOM order", () => {
  assert.equal(getLandingFocusTargetId({ address: "required", phone: "invalid" }, "v1kg", ["v500", "v1kg"]), "landing-phone");
});
