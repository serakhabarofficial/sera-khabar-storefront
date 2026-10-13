import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

test("the cart uses Geist for English while retaining Bengali fallback fonts", () => {
  assert.match(posterSource, /\.skc \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  for (const selector of [".skc-title", ".skc-info h3", ".skc-empty h3", ".skc-subtotal"]) {
    const rule = posterSource.slice(posterSource.indexOf(`${selector} {`)).split("}")[0];
    assert.match(rule, /font-family: "Geist", "Noto Serif Bengali", serif;/);
  }
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(html, /family=Geist:wght@100\.\.900/);
  assert.match(html, /family=Noto\+Serif\+Bengali:wght@400;500;600;700;800;900/);
});

test("cart prices and quantity digits use the Geist numeral face with a Bangla fallback", () => {
  for (const selector of [".skc-price", ".skc-qty span", ".skc-subtotal b"]) {
    const rule = posterSource.slice(posterSource.indexOf(`${selector} {`)).split("}")[0];
    assert.match(rule, /font-family: "Geist", "Noto Serif Bengali", serif;/);
  }
});

test("keeps the cart drawer English-only", () => {
  // The taka sign (U+09F3) is allowed: it is currency, not Bengali copy.
  const copySource = cartDrawerSource.replace(/\u09F3/g, "");
  assert.doesNotMatch(copySource, /[\u0980-\u09F2]/);
  assert.match(cartDrawerSource, /Your Cart/);
  assert.match(cartDrawerSource, /Your cart is empty/);
  assert.match(cartDrawerSource, /Proceed to Checkout/);
});

test("keeps both Continue Shopping actions on one line", () => {
  assert.equal((cartDrawerSource.match(/Continue Shopping/g) ?? []).length, 2);
  assert.equal((cartDrawerSource.match(/whitespace-nowrap/g) ?? []).length, 2);
});

test("renders the empty-cart Continue Shopping action as an underlined text control", () => {
  const emptyCartAction = cartDrawerSource.match(/<Button[\s\S]*?Continue Shopping[\s\S]*?<\/Button>/)?.[0] ?? "";

  assert.notEqual(emptyCartAction, "");
  assert.match(emptyCartAction, /variant="ghost"/);
  assert.match(emptyCartAction, /className="[^"]*rounded-none[^"]*border-0[^"]*border-b border-black/);
});

test("shows the subtotal with the taka sign, not the BDT code", () => {
  assert.match(cartDrawerSource, /toLocaleString\("en-US"\)\}/);
  assert.doesNotMatch(cartDrawerSource, /BDT \{subtotal/);
});

test("desktop cart is the same Vaul drawer as phones, as a floating right panel (2026-10-13)", () => {
  assert.match(cartDrawerSource, /<Drawer\.Root open=\{isOpen\} onOpenChange=\{setIsOpen\} direction=\{isMobile \? "bottom" : "right"\}>/);
  assert.match(cartDrawerSource, /isMobile \? "sk-sheet sk-cart-sheet" : "sk-panel sk-panel-right"/);
  assert.doesNotMatch(cartDrawerSource, /SheetContent/);
});
