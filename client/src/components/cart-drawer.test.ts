import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

const rule = (selector: string) => posterSource.slice(posterSource.indexOf(`${selector} {`)).split("}")[0];

test("the cart uses Geist with the Bengali fallback face", () => {
  assert.match(posterSource, /\.skc \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  for (const selector of [".skc-title", ".skc-info h3", ".skc-empty h3", ".skc-add h4"]) {
    assert.match(rule(selector), /font-family: "Geist", "Noto Serif Bengali", serif;/);
  }
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(html, /family=Geist:wght@100\.\.900/);
  assert.match(html, /family=Noto\+Serif\+Bengali:wght@300;400;500;600;700;800;900/);
});

test("cart prices and quantity digits use the numeral face", () => {
  for (const selector of [".skc-price", ".skc-qty span", ".skc-total", ".skc-card-price"]) {
    assert.match(rule(selector), /font-family: "Geist", "Noto Serif Bengali", serif;/);
    assert.match(rule(selector), /tabular-nums/);
  }
});

test("the cart speaks Bangla like the rest of the store (2026-10-19, এক নজরে)", () => {
  assert.match(cartDrawerSource, /<Drawer\.Title className="sr-only">ব্যাগ<\/Drawer\.Title>/);
  assert.match(cartDrawerSource, /ব্যাগ এখনও খালি/);
  assert.match(cartDrawerSource, /অর্ডার <i aria-hidden="true" \/>/);
  assert.doesNotMatch(cartDrawerSource, /Your cart|Proceed to Checkout|Continue Shopping/);
});

test("every cart row has its own always-visible remove button", () => {
  const row = cartDrawerSource.slice(cartDrawerSource.indexOf('className="skc-row"'), cartDrawerSource.indexOf("</motion.li>"));
  assert.match(row, /onClick=\{\(\) => removeFromCart\(item\.id\)\} aria-label=\{`\$\{name\} বাদ দিন`\}/);
  assert.match(rule(".skc-remove"), /width: 36px; height: 36px;/);
  assert.doesNotMatch(rule(".skc-remove"), /opacity: 0|display: none/);
});

test("the add-on rail is titled এর সাথে যোগ করুন and only offers sellable products", () => {
  assert.match(cartDrawerSource, /<h4 id="skc-add-title">এর সাথে যোগ করুন<\/h4>/);
  assert.doesNotMatch(cartDrawerSource, /এর সাথে নিন|সবাই নেয়/);
  assert.match(cartDrawerSource, /if \(product\.available === false \|\| !productUuid \|\| !variantId\) continue;/);
  // Sideways scrolling inside the drawer must not drag it shut.
  assert.match(cartDrawerSource, /<ul className="skc-rail" data-vaul-no-drag>/);
});

test("the free-delivery line follows checkout's rule", () => {
  assert.match(cartDrawerSource, /POLICY_FACTS\.freeDeliveryThreshold/);
  assert.match(cartDrawerSource, /bundleHasFreeDeliveryProduct\(cartOrder\)/);
});

test("shows taka amounts with the taka sign, not the BDT code", () => {
  assert.match(cartDrawerSource, /formatTaka\(subtotal\)/);
  assert.doesNotMatch(cartDrawerSource, /BDT \{subtotal/);
});

test("desktop cart is the same Vaul drawer as phones, as a floating right panel (2026-10-13)", () => {
  assert.match(cartDrawerSource, /<Drawer\.Root open=\{isOpen\} onOpenChange=\{setIsOpen\} direction=\{isMobile \? "bottom" : "right"\}>/);
  assert.match(cartDrawerSource, /isMobile \? "sk-sheet sk-cart-sheet" : "sk-panel sk-panel-right"/);
  assert.doesNotMatch(cartDrawerSource, /SheetContent/);
});

test("the whole cart is white, on phones and desktop (2026-10-20)", () => {
  assert.match(posterSource, /\.sk-cart-sheet, \.sk-panel-right \{ background: #fff; \}/);
  assert.match(rule(".skc-card"), /background: #fff;/);
  assert.match(rule(".skc-row"), /background: #fff;/);
});

test("adding from the rail moves the product into the bag with a fold-away animation", () => {
  assert.match(cartDrawerSource, /if \(inCart\.has\(productUuid\)\) continue;/);
  const rail = cartDrawerSource.slice(cartDrawerSource.indexOf('<ul className="skc-rail"'), cartDrawerSource.indexOf("</ul>", cartDrawerSource.indexOf('<ul className="skc-rail"')));
  assert.match(rail, /<AnimatePresence initial=\{false\}>/);
  assert.match(rail, /\{\.\.\.railFold\}/);
  // Animated boxes carry no padding: a padded box can't fold to 0 and jumps at the end.
  assert.doesNotMatch(rule(".skc-card-slot"), /padding/);
  assert.doesNotMatch(rule(".skc-item"), /padding/);
  assert.match(cartDrawerSource, /const foldEase = \[0\.4, 0, 0\.2, 1\] as const;/);
  assert.doesNotMatch(cartDrawerSource, /addedHere|data-added/);
});
