import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dialogSource = readFileSync(new URL("./order-dialog.tsx", import.meta.url), "utf8");
const comboboxSource = readFileSync(new URL("./place-combobox.tsx", import.meta.url), "utf8");
const pageCss = readFileSync(new URL("../checkout-page.css", import.meta.url), "utf8");
const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");
const productSource = readFileSync(new URL("../pages/product.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const stageCss = readFileSync(new URL("../stage.css", import.meta.url), "utf8");

test("checkout is its own page, not a sheet (Memo, approved 2026-10-18)", () => {
  assert.doesNotMatch(dialogSource, /from "vaul"|<Drawer\./);
  assert.match(dialogSource, /return createPortal\(\n\s+<div className="skx">/);
  assert.match(dialogSource, /document\.body,\n\s+\);/);
  // The rest of the app is hidden so the document itself scrolls: no nested scroll container for the keyboard to fight.
  assert.match(dialogSource, /root\.setAttribute\("data-sk-checkout", ""\)/);
  assert.match(pageCss, /html\[data-sk-checkout\] #root \{ display: none !important; \}/);
  // From the cart, Vaul must be able to finish its exit animation, or Radix keeps the page untappable.
  assert.match(pageCss, /html\[data-sk-checkout\] \[data-vaul-drawer\],\nhtml\[data-sk-checkout\] \[data-vaul-overlay\] \{ visibility: hidden !important; \}/);
  // The cart clears its bundle on close; the page keeps the last one while it animates away.
  assert.match(dialogSource, /const bundle = bundleProp \?\? lastBundle\.current;/);
});

test("checkout classes use their own skx- prefix (skc- belongs to the cart drawer)", () => {
  assert.doesNotMatch(dialogSource, /\bskc-/);
  assert.doesNotMatch(comboboxSource, /\bskc-/);
  assert.doesNotMatch(pageCss, /\.skc-/);
});

test("অর্ডার করুন opens checkout on the tap; the stock check runs afterwards", () => {
  assert.match(productSource, /setOrderOpen\(true\);\n\s+void verifyOrderable\(\)\.then\(\(orderable\) => \{\n\s+if \(!orderable\) setOrderOpen\(false\);/);
  assert.match(productSource, /<OrderDialog open=\{orderOpen\} onOpenChange=\{setOrderOpen\} bundle=\{orderBundle\} onQuantityChange=\{setQuantity\} \/>/);
});

test("the swap is instant and the browser animates it with the Lift View Transition", () => {
  assert.match(dialogSource, /document\.startViewTransition\(\(\) => \{\n\s+flushSync\(\(\) => setShown\(targetShown\.current\)\);/);
  assert.match(dialogSource, /root\.dataset\.skNav = open \? "forward" : "back";/);
  assert.match(dialogSource, /running\.current\?\.skipTransition\(\);/);
  // Forward: the product page fades out fast, the memo rises 24px.
  assert.match(pageCss, /html\[data-sk-nav="forward"\]::view-transition-old\(root\) \{ animation: 110ms ease-out both skx-fade-out; \}/);
  assert.match(pageCss, /html\[data-sk-nav="forward"\]::view-transition-new\(root\) \{ animation: 300ms cubic-bezier\(\.23, 1, \.32, 1\) 60ms both skx-rise; \}/);
  assert.match(pageCss, /@keyframes skx-rise \{ from \{ opacity: 0; transform: translateY\(24px\); \} \}/);
  // Back: the memo sinks 12px and the product page fades in.
  assert.match(pageCss, /html\[data-sk-nav="back"\]::view-transition-old\(root\) \{ animation: 150ms ease-out both skx-sink; \}/);
  assert.match(pageCss, /html\[data-sk-nav="back"\]::view-transition-new\(root\) \{ animation: 220ms ease-out 40ms both skx-fade-in; \}/);
  // Header and logo morph in place; names exist only while a checkout transition runs.
  assert.match(pageCss, /html\[data-sk-nav\] \.sk-header, html\[data-sk-nav\] \.stc-head, html\[data-sk-nav\] \.skx-header \{ view-transition-name: sk-site-header; \}/);
  assert.match(layoutSource, /className="stc stc-head" data-page-header=""/);
  assert.match(pageCss, /html\[data-sk-nav\] \.c-logoimg, html\[data-sk-nav\] \.skx-brand img \{ view-transition-name: sk-site-logo; \}/);
  for (const line of pageCss.split("\n").filter((text) => text.includes("view-transition-name:"))) {
    assert.match(line, /^html\[data-sk-nav\] /);
  }
});

test("reduced motion turns the Lift into a plain cross-fade", () => {
  assert.match(pageCss, /@media \(prefers-reduced-motion: reduce\) \{\n\s+html\[data-sk-nav\]::view-transition-group\(\*\) \{ animation: none !important; \}\n\s+html\[data-sk-nav\]::view-transition-old\(\*\) \{ animation: 160ms ease-out both skx-fade-out !important; \}/);
});

test("the checkout header matches the Stage logo sizes and its 860px mobile breakpoint", () => {
  assert.match(stageCss, /\.stc-head \.c-logoimg \{ height: 58px;/);
  assert.match(stageCss, /@media \(max-width: 860px\) \{[\s\S]*?\.stc-head \.c-logoimg \{ height: 40px; \}/);
  assert.match(pageCss, /\.skx-header-in \{ max-width: 1256px; height: 78px;/);
  assert.match(pageCss, /\.skx-brand img \{ display: block; width: auto; height: 58px; \}/);
  assert.match(pageCss, /@media \(max-width: 860px\) \{\n\s+\.skx-header-in \{ height: 60px; \}\n\s+\.skx-brand img \{ height: 40px; \}/);
});

test("the ordered items sit in a highlighted card above the form", () => {
  assert.match(dialogSource, /<div className="skx-order">\n\s+<div className="skx-label-row">\n\s+<span>আপনার পছন্দের খাবার<\/span>[\s\S]*?<\/ul>\n\s+<\/div>\n\n\s+<form/);
  assert.match(pageCss, /\.skx-order \{[^}]*border-radius: 14px; background: rgba\(241, 229, 211, \.62\);/);
});

test("the price shares the quantity stepper's row, so both sit on one centre line", () => {
  assert.match(dialogSource, /className=\{canEditQuantity \? "skx-item skx-item-editable" : "skx-item"\}/);
  assert.match(dialogSource, /<\/div>\n\s+\{canEditQuantity \? \(\n\s+<div className="skx-qty"/);
  assert.match(pageCss, /\.skx-item-editable \{ grid-template-areas: "img copy copy" "img qty price";/);
  assert.match(pageCss, /\.skx-item \.skx-qty \{ grid-area: qty; justify-self: start; \}/);
  assert.match(pageCss, /\.skx-item-price \{ grid-area: price; \}/);
});

test("the form starts straight at the fields, with no numbered section heading", () => {
  assert.doesNotMatch(dialogSource, /skx-section-num|কার কাছে পৌঁছে দেব/);
  assert.doesNotMatch(pageCss, /skx-section-(head|num)/);
});

test("the memo is held by a paper clip: tongue behind the paper, loop over it", () => {
  assert.match(dialogSource, /<PaperClip layer="back" \/>\s*<article className="skx-paper">/);
  assert.match(dialogSource, /<\/article>\s*<PaperClip layer="front" \/>/);
  assert.doesNotMatch(dialogSource + pageCss, /skx-pin/);
});

test("the phone's back button returns to the product, where the customer was", () => {
  assert.match(dialogSource, /window\.history\.pushState\(\{ \.\.\.window\.history\.state, \[HISTORY_KEY\]: historyToken\.current \}, ""\)/);
  // Closing from the page pops the entry it pushed, so back doesn't need pressing twice.
  assert.match(dialogSource, /else if \(!open && historyOpen\.current && ownsHistoryEntry\(\)\) \{\n\s+window\.history\.back\(\);/);
  assert.match(dialogSource, /window\.addEventListener\("popstate", onPopState\)/);
  // iOS's own swipe animation is not doubled.
  assert.match(dialogSource, /skipAnimation\.current = "hasUAVisualTransition" in event && Boolean\(event\.hasUAVisualTransition\);/);
  assert.match(dialogSource, /const productScroll = window\.scrollY;/);
  assert.match(dialogSource, /window\.scrollTo\(\{ top: productScroll, behavior: "instant" \}\);/);
  // The app's route scroll handling ignores this same-path entry and checkout's own scrolling.
  assert.match(appSource, /if \(window\.location\.pathname === currentLocation\.current\) return;/);
  assert.match(appSource, /if \(document\.documentElement\.hasAttribute\("data-sk-checkout"\)\) return;/);
});

test("validation is in Bangla and moves the customer to the first field that needs fixing", () => {
  assert.match(dialogSource, /errors\.name = "আপনার পুরো নাম লিখুন।"/);
  assert.match(dialogSource, /errors\.phone = "মোবাইল নম্বর লিখুন।"/);
  assert.match(dialogSource, /errors\.district = "জেলা বেছে নিন।"/);
  assert.match(dialogSource, /errors\.thana = values\.district \? "থানা বেছে নিন।" : "আগে জেলা বেছে নিন।"/);
  assert.match(dialogSource, /errors\.address = "বাড়ি, রাস্তা বা এলাকার নাম লিখুন।"/);
  // Bangla digits typed on a Bangla keyboard still count as a phone number.
  assert.match(dialogSource, /normalizeBdMobile\(toLatinDigits\(values\.phone\)\)/);
  assert.match(dialogSource, /const firstInvalid = \(Object\.keys\(fieldRefs\) as CheckoutField\[\]\)\.find\(\(field\) => fieldErrors\[field\]\);/);
});

test("জেলা and থানা are search dropdowns; the address sent is street, থানা, জেলা", () => {
  assert.match(dialogSource, /<PlaceCombobox\n\s+ref=\{fieldRefs\.district\}\n\s+kind="district"/);
  assert.match(dialogSource, /<PlaceCombobox\n\s+ref=\{fieldRefs\.thana\}\n\s+kind="thana"/);
  assert.match(comboboxSource, /role="combobox"/);
  assert.match(comboboxSource, /role="listbox"/);
  assert.match(dialogSource, /const address = composeDeliveryAddress\(current\.address, current\.thana, current\.district\);/);
  assert.doesNotMatch(dialogSource, /কোথায় পাঠাব/);
});

test("the delivery charge stays flat; the district only sets the delivery estimate", () => {
  assert.match(dialogSource, /const DELIVERY_CHARGE = 100;/);
  assert.match(dialogSource, /const deliveryCharge = qualifiesForFreeDelivery \? 0 : DELIVERY_CHARGE;/);
  assert.match(dialogSource, /const eta = deliveryWindow\(values\.district\);/);
  assert.match(dialogSource, /paymentMethod: "cash_on_delivery",/);
});

test("the order memo lists every item; only single-product checkout gets a quantity stepper", () => {
  assert.match(dialogSource, /const lineItems: OrderDialogLineItem\[\] = bundle\?\.lineItems\?\.length/);
  assert.match(dialogSource, /\{lineItems\.map\(\(item, index\) => \(/);
  assert.match(dialogSource, /src=\{item\.image\}/);
  assert.match(dialogSource, /money\(item\.unitPrice \* item\.quantity\)/);
  assert.match(dialogSource, /const canEditQuantity = Boolean\(onQuantityChange\) && lineItems\.length === 1;/);
  assert.match(dialogSource, /disabled=\{item\.quantity >= MAX_LINE_QUANTITY\}/);
});

test("cart checkout passes each cart item as its own line", () => {
  assert.match(cartDrawerSource, /lineItems: items\.map\(\(item\) => \(\{\n\s+\/\/ .*\n\s+name: item\.title\.replace\(` \(\$\{item\.size\}\)`, ""\),\n\s+details: item\.size,\n\s+quantity: item\.quantity,\n\s+unitPrice: parseCurrencyAmount\(item\.price\),\n\s+image: item\.image,/);
});

test("the order button sits in the page flow, never fixed to the bottom", () => {
  assert.match(dialogSource, /<button type="submit" disabled=\{orderSubmitting\} className="skx-submit">/);
  assert.doesNotMatch(pageCss, /position:\s*(fixed|sticky)/);
  assert.doesNotMatch(dialogSource, /IntersectionObserver/);
});

test("terms stay visible under the button; policies fold away; phone and WhatsApp help is in the footer", () => {
  const submitIndex = dialogSource.indexOf('type="submit"');
  const termsIndex = dialogSource.indexOf("অর্ডার করে আপনি আমাদের");
  const policyIndex = dialogSource.indexOf('<details className="skx-policy">');
  const footerIndex = dialogSource.indexOf('<footer className="skx-footer">');
  assert.ok(submitIndex > 0 && termsIndex > submitIndex && policyIndex > termsIndex && footerIndex > policyIndex);
  for (const slug of ["terms-and-conditions", "refund-return-exchange"]) {
    // A new tab, so the half-filled form is not lost.
    assert.match(dialogSource, new RegExp(`href="/${slug}" target="_blank"`));
  }
  assert.match(dialogSource, /পেমেন্ট শুধু ক্যাশ অন ডেলিভারি/);
  assert.match(dialogSource, /ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান/);
  assert.ok(dialogSource.indexOf('href="tel:+8801310980289"') > footerIndex);
  assert.ok(dialogSource.indexOf("https://wa.me/8801303103540") > footerIndex);
  assert.match(dialogSource, /encodeURIComponent\(whatsappOrderText\)/);
});

test("a placed order shows the Celebrate confirmation; a held order keeps its own screen", () => {
  assert.match(dialogSource, /<OrderConfirmed order=\{confirmedOrder\} onClose=\{close\} \/>/);
  assert.match(dialogSource, /firstName: name\.split\(\/\\s\+\/\)\[0\] \?\? "",\n\s+total: bundle\.price \+ deliveryCharge,/);
  assert.match(dialogSource, /warmOrderConfirmedArt\(\);/);
  assert.match(dialogSource, /<OrderHoldConfirmation \/>/);
  // The confirmation's styles expect the sheet's font variables and its 18px side padding.
  assert.match(pageCss, /\.skx-done \{ --sko-body: "Geist", "Noto Serif Bengali", serif; --sko-disp: "Geist", "Noto Serif Bengali", serif;\n\s+[^}]*padding: 0 18px 24px;/);
});

test("typed details survive closing and reopening; a finished order starts fresh", () => {
  assert.match(dialogSource, /if \(open && settled\.current\) \{\n\s+setValues\(emptyValues\);/);
  assert.match(dialogSource, /if \(!nextOpen\) \{\n\s+void capture\.finalize\(\);/);
});
