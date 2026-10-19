import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./dock-contact.tsx", import.meta.url), "utf8");
const stageCss = readFileSync(new URL("../stage.css", import.meta.url), "utf8");
const posterCss = readFileSync(new URL("../poster.css", import.meta.url), "utf8");
const productSource = readFileSync(new URL("../pages/product.tsx", import.meta.url), "utf8");

test("the contact card offers phone and WhatsApp ordering", () => {
  assert.match(source, /const PHONE_HREF = "tel:\+8801310980289";/);
  assert.match(source, /const WHATSAPP_NUMBER = "8801303103540";/);
  assert.match(source, /<b>ফোনে অর্ডার<\/b>/);
  assert.match(source, /<b>হোয়াটসঅ্যাপে অর্ডার<\/b>/);
  assert.match(source, /target="_blank"\s+rel="noopener noreferrer"/);
});

test("the seal is a toggle tied to its card", () => {
  assert.match(source, /aria-expanded=\{open\}\s+aria-controls=\{DOCK_CONTACT_CARD_ID\}/);
  assert.match(source, /role="dialog" aria-label="সরাসরি অর্ডার"/);
  assert.match(source, /event\.key === "Escape"/);
});

test("the phone icon rings on a loop and stands still with reduced motion", () => {
  assert.match(source, /repeatCount="indefinite"/);
  assert.match(source, /<RingingPhoneIcon still=\{still\} \/>/);
  assert.match(source, /const still = Boolean\(useReducedMotion\(\)\);/);
  assert.match(stageCss, /@media \(prefers-reduced-motion: reduce\) \{\n  \.sk-contact-shape,/);
});

test("the card opens in a circle from the seal and dims the page like the sheets", () => {
  assert.match(stageCss, /\.sk-contact-card \{[^}]*clip-path: circle\(0px at 50% calc\(100% \+ 44px\)\)/);
  assert.match(stageCss, /\.sk-contact-scrim \{[^}]*background: rgba\(42, 28, 20, 0\.38\)/);
  // The bag stays on the right edge, হোম mirrors it, and the five icon centres are evenly spaced.
  assert.match(stageCss, /grid-template-columns: 24px minmax\(0, 1fr\) repeat\(3, minmax\(0, 2fr\)\) minmax\(0, 1fr\) 24px;/);
  assert.match(stageCss, /\.sk-dock \.sk-dock-cart \{ grid-column: span 2; justify-self: end;/);
});

test("the product page names its product in the card and hides its phone row on phones", () => {
  assert.match(productSource, /useDockContactProduct\(product \? \{/);
  assert.ok(productSource.indexOf("useDockContactProduct(") < productSource.indexOf("if (isLoading) {"));
  assert.match(posterCss, /@media \(max-width: 767px\) \{ \.skp-or, \.skp-help \{ display: none; \} \}/);
});

test("the phone menu ends with the seal card: ringing phone, Call and WhatsApp pills, no numbers on show (2026-10-20)", () => {
  const dock = readFileSync(new URL("./dock-contact.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../stage.css", import.meta.url), "utf8");
  assert.match(layout, /<MenuContactCard style=\{\{ "--i": 6 \} as CSSProperties\} \/>/);
  const card = dock.slice(dock.indexOf("export function MenuContactCard"), dock.indexOf("export const DOCK_CONTACT_CARD_ID"));
  assert.match(card, /<RingingPhoneIcon still=\{still\} \/>/);
  assert.match(card, /<path d=\{SEAL_EDGE\} \/>/);
  assert.match(card, /সরাসরি <b>অর্ডার<\/b>/);
  assert.match(card, /href=\{PHONE_HREF\}/);
  // The numbers are only in the buttons' accessible names.
  assert.doesNotMatch(card, />[০-৯]{5}-[০-৯]{6}</);
  assert.match(stage, /\.stm-contact \{[^}]*background: var\(--st-wash\);/);
});
