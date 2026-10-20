import assert from "node:assert/strict";
import test from "node:test";
import { markAmsottoPurchaseTracked } from "./tracking";

test("privacy storage denial still allows exactly one Purchase per accepted order", () => {
  const denied = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  assert.equal(markAmsottoPurchaseTracked(denied, "SK-TEST-DENIED"), true);
  assert.equal(markAmsottoPurchaseTracked(denied, "SK-TEST-DENIED"), false);
  assert.equal(markAmsottoPurchaseTracked(undefined, "SK-TEST-NO-STORAGE"), true);
  assert.equal(markAmsottoPurchaseTracked(undefined, "SK-TEST-NO-STORAGE"), false);
  assert.equal(markAmsottoPurchaseTracked(undefined, ""), false);
});
test("an existing persisted Purchase marker prevents a duplicate", () => {
  assert.equal(markAmsottoPurchaseTracked({ getItem: () => "1", setItem: () => assert.fail("must not write an existing marker") }, "SK-TEST-PERSISTED"), false);
});
