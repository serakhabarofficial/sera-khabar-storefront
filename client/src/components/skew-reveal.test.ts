import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";

const component = await import("./skew-reveal.tsx").catch(() => null);

test("Skew reveal keeps a complete Bangla heading readable before JavaScript runs", () => {
  assert.ok(component, "SkewReveal component is missing");
  const html = renderToStaticMarkup(createElement(component.default, {
    as: "h1",
    className: "mh-title",
    children: "খেজুরের পাটালী",
  }));
  assert.match(html, /^<h1 class="mh-title" data-skew-reveal="">/);
  assert.match(html, />খেজুরের<\/span> <span[^>]*>পাটালী<\/span>/);
  assert.doesNotMatch(html, /aria-hidden|opacity|filter|transform/);
});

test("shared captions can opt out completely on non-homepage routes", () => {
  assert.ok(component, "SkewReveal component is missing");
  const html = renderToStaticMarkup(createElement(component.default, {
    as: "b",
    enabled: false,
    children: "ক্যাশ মেমো",
  }));
  assert.equal(html, "<b>ক্যাশ মেমো</b>");
});

test("hero headings can stagger after their kicker without changing the text or spacing", () => {
  assert.ok(component, "SkewReveal component is missing");
  const html = renderToStaticMarkup(createElement(component.default, {
    as: "h2",
    delay: 70,
    children: "  রাজশাহীর  রান্নাঘরের গল্প  ",
  }));
  assert.match(html, /data-skew-delay="70"/);
  assert.equal(html.replace(/<[^>]*>/g, ""), "  রাজশাহীর  রান্নাঘরের গল্প  ");
});
