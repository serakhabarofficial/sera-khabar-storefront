import assert from "node:assert/strict";
import test from "node:test";
import { SITE_ACCESS_COOKIE, hasSiteAccess, signSiteAccess, siteAccessGate } from "./site-access.ts";

const password = "Serakhabar11$@11";
const secret = "s".repeat(40);
const now = Date.UTC(2026, 9, 12);
const opts = { password, secret, now: () => now, delay: async () => {} };
const req = (path: string, init: RequestInit = {}) => new Request(`https://www.serakhabar.com${path}`, init);
const login = (body: unknown) => req("/api/site-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("does nothing when no password is configured", async () => {
  assert.equal(await siteAccessGate(req("/"), { password: undefined }), undefined);
  assert.equal(await siteAccessGate(req("/api/site-access", { method: "POST" }), { password: "" }), undefined);
});

test("shows the coming-soon letter to visitors without access", async () => {
  const res = await siteAccessGate(req("/product/mango-leather-pickle"), opts);
  assert.ok(res);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(res.headers.get("cache-control"), "no-store");
  const html = await res.text();
  assert.match(html, /প্রিয় গ্রাহক,/);
  assert.match(html, /জাহিদুল ইসলাম/);
  assert.match(html, /href="tel:\+8801310980289"/);
  assert.match(html, /href="https:\/\/wa\.me\/8801303103540"/);
  assert.doesNotMatch(html, new RegExp(password.replace(/[$]/g, "\\$")));
});

test("blocks shop APIs without access and keeps robots out", async () => {
  assert.equal((await siteAccessGate(req("/api/orders", { method: "POST" }), opts))?.status, 401);
  const robots = await siteAccessGate(req("/robots.txt"), opts);
  assert.match(await robots!.text(), /Disallow: \//);
});

test("lets the letter's assets and the Suite's signed campaign refresh through", async () => {
  assert.equal(await siteAccessGate(req("/coming-soon/sera-khabar-logo.webp"), opts), undefined);
  assert.equal(await siteAccessGate(req("/go/_refresh", { method: "POST" }), opts), undefined);
});

test("a wrong password is refused without a cookie", async () => {
  let delayed = 0;
  const res = await siteAccessGate(login({ password: "serakhabar11$@11" }), { ...opts, delay: async ms => { delayed = ms; } });
  assert.equal(res?.status, 401);
  assert.equal(res?.headers.get("set-cookie"), null);
  assert.ok(delayed > 0);
  assert.equal((await siteAccessGate(login("nope"), opts))?.status, 401);
  assert.equal((await siteAccessGate(req("/api/site-access"), opts))?.status, 405);
});

test("the right password sets a 30-day signed cookie that opens the shop", async () => {
  const res = await siteAccessGate(login({ password }), opts);
  assert.equal(res?.status, 200);
  const cookie = res!.headers.get("set-cookie")!;
  assert.match(cookie, new RegExp(`^${SITE_ACCESS_COOKIE}=\\d+\\.[a-f0-9]{64}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax$`));
  const value = cookie.split(";")[0];
  assert.equal(await siteAccessGate(req("/", { headers: { cookie: `other=1; ${value}` } }), opts), undefined);
  assert.equal(await siteAccessGate(req("/api/orders", { method: "POST", headers: { cookie: value } }), opts), undefined);
});

test("cookies expire, cannot be forged, and die when the password changes", () => {
  const good = signSiteAccess(now + 1000, password, secret);
  assert.equal(hasSiteAccess(`${SITE_ACCESS_COOKIE}=${good}`, password, secret, now), true);
  assert.equal(hasSiteAccess(`${SITE_ACCESS_COOKIE}=${good}`, password, secret, now + 1000), false);
  assert.equal(hasSiteAccess(`${SITE_ACCESS_COOKIE}=${now + 1000}.${"0".repeat(64)}`, password, secret, now), false);
  assert.equal(hasSiteAccess(`${SITE_ACCESS_COOKIE}=${good}`, "new-password", secret, now), false);
  assert.equal(hasSiteAccess(`${SITE_ACCESS_COOKIE}=${good}`, password, "other-secret", now), false);
  assert.equal(hasSiteAccess(null, password, secret, now), false);
});
