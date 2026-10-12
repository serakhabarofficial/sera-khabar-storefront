import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

// Sera Khabar has no Google Tag Manager container yet; the copied Mango Lover
// container must never ship. Add Sera Khabar's own GTM here when it exists.
test("ships no Google Tag Manager or GA4 tag until Sera Khabar has its own", () => {
  assert.doesNotMatch(html, /GTM-5KKTRHFD/);
  assert.doesNotMatch(html, /googletagmanager\.com/);
  assert.doesNotMatch(html, /gtag\s*\(\s*["']config["']/);
});
