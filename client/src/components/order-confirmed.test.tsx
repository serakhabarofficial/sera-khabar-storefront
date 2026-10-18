import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ORDER_PACK_STILL, ORDER_PACK_VIDEO, OrderConfirmed } from "./order-confirmed.tsx";

const order = { ref: "1048", firstName: "রাকিব", total: 1371 };

test("the confirmation thanks the customer by name and shows the order number, total and next step", () => {
  const markup = renderToStaticMarkup(<OrderConfirmed order={order} onClose={() => {}} />);
  assert.match(markup, /role="status"/);
  assert.match(markup, /ধন্যবাদ!/);
  assert.match(markup, /রাকিব, আপনার অর্ডার পাঠানোর প্রস্তুতি চলছে/);
  assert.match(markup, /#1048/);
  assert.match(markup, /৳১,৩৭১/);
  assert.match(markup, /ফোন করে অর্ডারটি কনফার্ম করবে/);
});

test("without a first name the headline still reads naturally", () => {
  const markup = renderToStaticMarkup(<OrderConfirmed order={{ ...order, firstName: "" }} onClose={() => {}} />);
  assert.match(markup, /<h3[^>]*>আপনার অর্ডার পাঠানোর প্রস্তুতি চলছে<\/h3>/);
});

test("phone and WhatsApp are one tap away, and WhatsApp carries the order number", () => {
  const markup = renderToStaticMarkup(<OrderConfirmed order={order} onClose={() => {}} />);
  assert.match(markup, /href="tel:\+8801310980289"/);
  assert.match(markup, /href="https:\/\/wa\.me\/8801303103540\?text=Hello%2C%20my%20order%20number%20is%201048"/);
});

test("the kraft bag falls back to its still frame where the transparent video can't play", () => {
  // No window (server render) stands in for Safari/iOS and reduced motion: only the still is rendered.
  const markup = renderToStaticMarkup(<OrderConfirmed order={order} onClose={() => {}} />);
  assert.match(markup, /data-still="true"/);
  assert.doesNotMatch(markup, /<video/);
  assert.match(markup, new RegExp(`src="${ORDER_PACK_STILL}"`));
});

test("the bag files ship under versioned names, since public assets are cached as immutable", () => {
  for (const path of [ORDER_PACK_VIDEO, ORDER_PACK_STILL]) {
    assert.match(path, /-\d+\.(webm|webp)$/);
    assert.ok(existsSync(new URL(`../../public${path}`, import.meta.url)), `${path} exists`);
  }
  const source = readFileSync(new URL("./order-confirmed.tsx", import.meta.url), "utf8");
  // Safari drops WebM transparency, and autoplay can be refused; both fall back to the still.
  assert.match(source, /iPad\|iPhone\|iPod/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /video\.play\(\)\?\.catch\(\(\) => setStill\(true\)\)/);
  assert.match(source, /onError=\{\(\) => setStill\(true\)\}/);
});
