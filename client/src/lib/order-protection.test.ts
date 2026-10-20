import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { addPastedField, addPhoneCandidate, firstFocusTimestamp, getOrCreateClientSessionId } from "./order-protection";

test("keeps first form interaction and only the latest complete phone", () => {
  assert.equal(firstFocusTimestamp("2026-09-23T10:00:00.000Z", "2026-09-23T10:01:00.000Z"), "2026-09-23T10:00:00.000Z");
  assert.deepEqual(["01712345678", "01712345678", "01812345678", "01912345678", "01312345678", "01412345678", "01512345678", "abc"]
    .reduce(addPhoneCandidate, [] as string[]), []);
  assert.deepEqual(["phone", "address", "phone", "email", "name"]
    .reduce(addPastedField, [] as Array<"name" | "phone" | "address">), ["phone", "address", "name"]);
});

test("does not retain intermediate phone candidates while a customer edits", () => {
  assert.deepEqual(addPhoneCandidate([], "01712345678"), ["01712345678"]);
  assert.deepEqual(addPhoneCandidate(["01712345678"], "01812345678"), ["01812345678"]);
  assert.deepEqual(addPhoneCandidate(["01712345678"], "0171234567"), []);
});

test("persists one opaque client session id per browser session", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const first = getOrCreateClientSessionId(storage);
    assert.equal(first, getOrCreateClientSessionId(storage));
    assert.ok(first.length > 8);
});

test("adds the challenge and honeypot to every checkout surface", () => {
    for (const file of [
      "client/src/components/order-dialog.tsx",
      "client/src/features/landing/landing-checkout.tsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      assert.ok(source.includes("TurnstileChallenge"));
      assert.ok(source.includes('name="hp_x7"'));
      assert.ok(!source.includes('name="website"'));
      assert.ok(source.includes("buildProtectionPayload"));
      assert.ok(source.includes("formHandlers.onFocusCapture"));
      assert.ok(source.includes("formHandlers.onPasteCapture"));
    }
});
