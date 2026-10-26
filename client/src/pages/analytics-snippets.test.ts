import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

// The copied Mango Lover container must never ship again.
test("ships no Mango Lover Google Tag Manager or GA4 tag", () => {
  assert.doesNotMatch(html, /GTM-5KKTRHFD/);
  assert.doesNotMatch(html, /G-Q7J7KV6ZVC/);
  assert.doesNotMatch(html, /gtag\s*\(\s*["']config["']/);
});

test("loads Sera Khabar's GTM container high in the head and its noscript after body opens", () => {
  const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
  const gtmScript = head.indexOf("googletagmanager.com/gtm.js");
  assert.ok(gtmScript !== -1, "GTM script must be in <head>");
  assert.match(head, /'dataLayer','GTM-MHFGH4B8'/);
  // Only charset and viewport may come before it.
  assert.ok(gtmScript < head.indexOf("<title>"), "GTM script must come before <title>");

  const afterBody = html.slice(html.indexOf("<body>") + "<body>".length).trimStart();
  assert.ok(afterBody.startsWith("<!-- Google Tag Manager (noscript) -->"));
  assert.match(afterBody, /googletagmanager\.com\/ns\.html\?id=GTM-MHFGH4B8/);

  assert.equal(html.match(/GTM-[A-Z0-9]+/g)?.length, 2, "exactly one container, loaded once");
});
