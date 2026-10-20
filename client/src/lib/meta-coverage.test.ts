import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Finds landing pages by file name, so a new landing is covered without editing this test.
// Naming contract (docs/meta-pixel-handoff.md): client/src/features/<name>/<anything>-checkout.tsx and
// client/src/pages/<name>-thank-you.tsx.
const srcUrl = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, srcUrl), "utf8");

const featureCheckouts = readdirSync(new URL("features/", srcUrl), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((dir) => readdirSync(new URL(`features/${dir.name}/`, srcUrl))
    .filter((file) => file.endsWith("-checkout.tsx"))
    .map((file) => `features/${dir.name}/${file}`));
const thankYouPages = readdirSync(new URL("pages/", srcUrl))
  .filter((file) => file.endsWith("-thank-you.tsx"))
  .map((file) => `pages/${file}`);

function sourceFiles(dir: string): string[] {
  return readdirSync(new URL(dir, srcUrl), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(`${path}/`);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("finds the landing checkouts and thank-you pages", () => {
  assert.ok(featureCheckouts.length >= 1, featureCheckouts.join(", "));
  assert.ok(thankYouPages.length >= 1, thankYouPages.join(", "));
});

test("every landing checkout sends ViewContent and InitiateCheckout through the shared helper", () => {
  for (const path of featureCheckouts) {
    const source = read(path);
    assert.match(source, /trackGoogleEcommerceEvent\("view_item"/, `${path} must send view_item (Meta ViewContent)`);
    assert.match(source, /trackGoogleEcommerceEvent\("begin_checkout"/, `${path} must send begin_checkout (Meta InitiateCheckout)`);
  }
});

test("every thank-you page sends one Purchase keyed by the Suite's order reference", () => {
  for (const path of thankYouPages) {
    const source = read(path);
    assert.match(source, /trackGoogleEcommerceEvent\("purchase"/, `${path} must send purchase (Meta Purchase)`);
    assert.match(source, /transactionId: confirmation\.orderRef/, `${path}: transactionId must be the order reference, or Meta counts the order twice`);
    assert.match(source, /customer: \{/, `${path} must pass the customer block`);
  }
});

test("no page talks to Meta directly", () => {
  for (const path of sourceFiles("")) {
    if (path === "lib/meta-pixel.ts") continue;
    assert.doesNotMatch(read(path), /\bfbq\b|connect\.facebook\.net|graph\.facebook\.com/, `${path} must use trackGoogleEcommerceEvent, not the Pixel directly`);
  }
});
