import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dialogSource = readFileSync(new URL("./order-dialog.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

test("the Place Order button shows a centred one-line label and no arrow", () => {
  assert.match(dialogSource, /<form\s+id="order-dialog-form"/);
  assert.match(dialogSource, /<button\n\s+type="submit"\n\s+disabled=\{orderSubmitting\}/);
  assert.match(dialogSource, /className="sko-submit sko-press"/);
  assert.match(dialogSource, /className="sko-submit-label">\n\s+\{orderSubmitting \? "Placing Order\.\.\. - অর্ডার হচ্ছে\.\.\." : "Place Order - অর্ডার করুন"\}/);
  assert.match(posterSource, /\.sko-submit-label \{[^}]*white-space: nowrap; text-align: center;/);
  // The total is shown once, in the summary above; the button repeats no price.
  assert.doesNotMatch(dialogSource, /sko-submit-label">\n\s+৳/);
  assert.doesNotMatch(dialogSource, /ArrowRight/);
});

test("checkout is the cart's Vaul sheet: bottom sheet on phones, right panel on desktop (2026-10-13)", () => {
  assert.match(dialogSource, /<Drawer\.Root open=\{open\} onOpenChange=\{resetDialog\} direction=\{isMobile \? "bottom" : "right"\}>/);
  assert.match(dialogSource, /isMobile \? "sk-sheet sko-sheet" : "sk-panel sk-panel-right sko-panel"/);
  assert.doesNotMatch(dialogSource, /@\/components\/ui\/dialog/);
  // The cart clears its bundle on close; the sheet keeps the last one for the exit slide.
  assert.match(dialogSource, /const bundle = bundleProp \?\? lastBundle\.current;/);
  // Dragging inside the form must not pull the sheet down while typing.
  assert.match(dialogSource, /className="sko-form"\n\s+data-vaul-no-drag/);
});

test("there is no separate floating Place Order button", () => {
  assert.doesNotMatch(dialogSource, /order-floating-cta/);
  assert.doesNotMatch(dialogSource, /IntersectionObserver/);
  assert.doesNotMatch(dialogSource, /isMetaInAppBrowser/);
  assert.doesNotMatch(cssSource, /order-floating-cta|order-dialog-form/);
});

test("validation errors move the customer to the field that needs fixing", () => {
  assert.match(dialogSource, /const failField = /);
  assert.match(dialogSource, /failField\("name", "Please enter your full name\."\)/);
  assert.match(dialogSource, /failField\("phone", "Please enter your phone number\."\)/);
  assert.match(dialogSource, /failField\("address", "Please enter your delivery address\."\)/);
});

const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");

test("the order summary lists every item with its own image, name, quantity and price", () => {
  assert.match(dialogSource, /lineItems\?: OrderDialogLineItem\[\]/);
  // Single-product checkout falls back to one line built from the bundle.
  assert.match(dialogSource, /const lineItems: OrderDialogLineItem\[\] = bundle\?\.lineItems\?\.length/);
  assert.match(dialogSource, /\{lineItems\.map\(\(item, index\) => \(/);
  assert.match(dialogSource, /src=\{item\.image\}/);
  assert.match(dialogSource, /Qty \{item\.quantity\}/);
  assert.match(dialogSource, /৳\{\(item\.unitPrice \* item\.quantity\)\.toLocaleString\(\)\}/);
  // No more collapsed "Cart Checkout" card with one image.
  assert.doesNotMatch(dialogSource, /src=\{bundle\.images\[0\]\.src\}/);
});

test("cart checkout passes each cart item as its own line", () => {
  assert.match(cartDrawerSource, /lineItems: items\.map\(\(item\) => \(\{\n\s+\/\/ .*\n\s+name: item\.title\.replace\(` \(\$\{item\.size\}\)`, ""\),\n\s+details: item\.size,\n\s+quantity: item\.quantity,\n\s+unitPrice: parseCurrencyAmount\(item\.price\),\n\s+image: item\.image,/);
});

test("phone and WhatsApp order options sit below the Place Order button", () => {
  const submitIndex = dialogSource.indexOf('type="submit"');
  const helpIndex = dialogSource.indexOf("আমরা সবসময় আপনাকে সাহায্য করতে প্রস্তুত");
  const phoneIndex = dialogSource.indexOf('href="tel:+8801310980289"');
  const whatsappIndex = dialogSource.indexOf("https://wa.me/8801303103540");
  assert.ok(submitIndex > 0 && helpIndex > submitIndex, "help message follows the submit button");
  assert.ok(phoneIndex > helpIndex && whatsappIndex > phoneIndex, "phone then WhatsApp follow the message");
  assert.match(dialogSource, /অর্ডার করতে সমস্যা হচ্ছে\?/);
  assert.match(dialogSource, /ফোনে অর্ডার/);
  assert.match(dialogSource, /হোয়াটসএপ-এ অর্ডার/);
  // WhatsApp opens with the customer's items already filled in.
  assert.match(dialogSource, /const whatsappOrderText = /);
  assert.match(dialogSource, /encodeURIComponent\(whatsappOrderText\)/);
});

test("checkout ends with a short summary of the store policies and links to them", () => {
  const whatsappIndex = dialogSource.indexOf("https://wa.me/8801303103540");
  const termsIndex = dialogSource.indexOf("অর্ডার করার আগে জেনে নিন");
  assert.ok(termsIndex > whatsappIndex, "policy summary follows the phone/WhatsApp buttons");
  // Every point restates the published policy pages in site-pages.ts.
  assert.match(dialogSource, /পেমেন্ট শুধু ক্যাশ অন ডেলিভারি/);
  assert.match(dialogSource, /ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিনে ডেলিভারি/);
  assert.match(dialogSource, /ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান/);
  // Links open in a new tab so the half-filled form is not lost.
  for (const slug of ["terms-and-conditions", "refund-return-exchange"]) {
    assert.match(dialogSource, new RegExp(`href="/${slug}"\\s+target="_blank"`));
  }
});

test("a placed order shows the Celebrate confirmation with the kraft bag (2026-10-18)", () => {
  assert.match(dialogSource, /<OrderConfirmed order=\{confirmedOrder\} onClose=\{\(\) => resetDialog\(false\)\} \/>/);
  // The total and first name are captured at submit time, from what the customer actually ordered.
  assert.match(dialogSource, /firstName: name\.split\(\/\\s\+\/\)\[0\] \?\? "",\n\s+total: bundle\.price \+ selectedDeliveryCharge,/);
  // The bag is fetched when checkout opens, so it plays straight away after the order goes through.
  assert.match(dialogSource, /warmOrderConfirmedArt\(\);/);
  // The sun block runs edge to edge: no top padding, and the grab handle and close button sit over it.
  assert.match(dialogSource, /orderSubmitted \? "sko sko-is-done" : "sko"/);
  assert.match(dialogSource, /orderSubmitted \? "sk-sheet-grab sko-grab-over" : "sk-sheet-grab"/);
  assert.match(posterSource, /\.sko\.sko-is-done \{[^}]*padding-top: 0;/);
  // Held orders keep their own screen, which never claims the order is confirmed.
  assert.match(dialogSource, /<OrderHoldConfirmation \/>/);
});

test("the order form is white and sets English text in Geist (2026-10-13)", () => {
  const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(htmlSource, /family=Geist:wght@100\.\.900/);
  assert.match(posterSource, /\.sko-sheet, \.sko-panel \{[^}]*background: #ffffff;/);
  // Geist first, so Latin text uses it and Bangla falls back to the Bangla fonts.
  assert.match(posterSource, /\.sko \{[^}]*--sko-body: "Geist", "Noto Serif Bengali", serif;[^}]*--sko-disp: "Geist", "Noto Serif Bengali", serif;/);
  assert.doesNotMatch(posterSource, /\.sko[^{]*\{[^}]*font-family: "Noto Serif Bengali"/);
});
