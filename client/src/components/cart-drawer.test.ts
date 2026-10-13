import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");

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
