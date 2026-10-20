import assert from "node:assert/strict";
import test from "node:test";
import { createAbandonedCartCapture } from "../../lib/abandoned-cart-capture";

test("campaign drafts remain isolated even when sessionStorage is denied", () => {
  const denied = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
  const options = { source: "kalojira_mixed" as const, storage: denied, debounceMs: 60_000 };
  const honey = createAbandonedCartCapture({ ...options, createDraftKey: () => "11111111-1111-4111-8111-111111111111" });
  const achar = createAbandonedCartCapture({ ...options, draftScope: "am_sotto_achar", createDraftKey: () => "22222222-2222-4222-8222-222222222222" });
  const snapshot = { phone: "01712345678", items: [{ productName: "Test only", quantity: 1, unitPrice: 350 }], subtotal: 350, deliveryRate: 100, total: 450 };
  honey.capture(snapshot); achar.capture(snapshot);
  assert.notEqual(honey.draftKey, achar.draftKey);
  const resumed = createAbandonedCartCapture({ ...options, draftScope: "am_sotto_achar" });
  assert.equal(resumed.draftKey, achar.draftKey);
  achar.clear();
  assert.equal(honey.draftKey, "11111111-1111-4111-8111-111111111111");
  honey.clear(); honey.dispose(); achar.dispose(); resumed.dispose();
});
