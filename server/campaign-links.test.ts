import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCampaignDestination, readCampaignClickCookie, readCampaignReceipt, signCampaignClick, signCampaignReceipt, resolveCampaignRedirect } from './campaign-links.ts';
import { normalizeLandingPagePath } from './landing-page-attribution.ts';

export const secret = 'test-campaign-context-secret-0123456789abcdef';
export const clickId = '11111111-1111-4111-8111-111111111111';
export const utm = { utm_source: 'facebook', utm_medium: 'campaign_link', utm_campaign: 'himsagar-reel' };
const req = (url = '/go/himsagar-reel', method = 'GET') => ({ url, method, headers: { 'user-agent': 'Mozilla/5.0 FBAN/FBIOS', 'x-vercel-forwarded-for': '103.12.44.7' }, socket: { remoteAddress: '127.0.0.1' } });
const config = { merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', secret, local: false };
const response = (data: unknown) => new Response(JSON.stringify(data));
test('query merge retains first values, empty values, destination-only keys and fragment', () => {
  const merged = new URL(mergeCampaignDestination('/product/himsagar?utm_source=instagram&variant=large&variant=small#buy', '?utm_source=&utm_source=custom&fbclid=abc&ad_id=42', utm), 'https://www.serakhabar.com');
  assert.equal(merged.pathname, '/product/himsagar'); assert.equal(merged.hash, '#buy');
  assert.deepEqual([...merged.searchParams], [['utm_source', ''], ['variant', 'large'], ['fbclid', 'abc'], ['ad_id', '42'], ['utm_medium', 'campaign_link'], ['utm_campaign', 'himsagar-reel']]);
});
for (const [incoming, expected] of [
  ['', utm], ['?utm_source=fb_ads&fbclid=abc', { ...utm, utm_source: 'fb_ads', fbclid: 'abc' }],
  ['?utm_source=custom&utm_medium=cpc&utm_campaign=launch&ad_id=42', { utm_source: 'custom', utm_medium: 'cpc', utm_campaign: 'launch', ad_id: '42' }],
] as const) test(`automatic UTM example: ${incoming || 'no query'}`, () => {
  assert.deepEqual(Object.fromEntries(new URL(mergeCampaignDestination('/', incoming, utm), 'https://www.serakhabar.com').searchParams), expected);
});
test('signed cookie rejects tampering, duplicate names, missing secrets and oversized headers', () => {
  const cookie = signCampaignClick(clickId, secret);
  const read = (value: string) => readCampaignClickCookie({ headers: { cookie: value } }, secret);
  assert.equal(read(`ml_device_id=device; ml_cclick=${cookie}`), clickId);
  assert.equal(read(`ml_cclick=${cookie}; ml_cclick=${cookie}`), undefined);
  assert.equal(read(`ml_cclick=${cookie.slice(0, -1)}z`), undefined);
  assert.equal(read(`ml_cclick=${clickId}`), undefined);
  assert.equal(read('x'.repeat(9000)), undefined);
  assert.equal(readCampaignClickCookie({ headers: { cookie: `ml_cclick=${cookie}` } }, 'short'), undefined);
  const edgeCookie = signCampaignClick(clickId, secret);
  assert.equal(readCampaignClickCookie({ headers: { cookie: `ml_cclick=${edgeCookie}` } }, '', secret), clickId);
});
test('receipt is forwarded only when signed, current, attributable, and bound to the matching legacy click cookie', () => {
  const event = { v: 1, handle: 'serakhabar', linkId: clickId, clickId, clickedAt: new Date().toISOString(), isBot: false,
    visitorHash: null, referrerHost: null, device: 'unknown' };
  const proof = signCampaignReceipt(event, secret);
  const request = (receipt: string, click = clickId) => ({ headers: { cookie: `ml_cclick=${signCampaignClick(click, secret)}; ml_cproof=${receipt}` } });
  assert.equal(readCampaignReceipt(request(proof), secret, secret), proof);
  assert.equal(readCampaignReceipt(request(proof, '22222222-2222-4222-8222-222222222222'), secret, secret), undefined);
  assert.equal(readCampaignReceipt(request(`${proof.slice(0, -1)}x`), secret, secret), undefined);
  assert.equal(readCampaignReceipt(request(signCampaignReceipt({ ...event, isBot: true }, secret)), secret, secret), undefined);
});
test('resolved redirects send trusted context and a navigation UUID, not spoofed browser IP', async () => {
  let sent: RequestInit | undefined;
  const request = req('/go/himsagar-reel?fbclid=abc');
  const result = await resolveCampaignRedirect(request, 'himsagar-reel', { ...config, fetchImpl: async (_url, init) => { sent = init; return response({ clickId, destinationPath: '/product/himsagar', utm }); } });
  const headers = new Headers(sent?.headers);
  assert.match(headers.get('x-mlbd-campaign-request-id') || '', /^[\da-f-]{36}$/);
  const context = JSON.parse(Buffer.from((headers.get('x-mlbd-client-context') || '').split('.')[0], 'base64url').toString());
  assert.equal(context.ip, '103.12.44.7');
  assert.equal(result.cookie, `ml_cclick=${signCampaignClick(clickId, secret)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
  assert.equal(new URL(result.location, 'https://www.serakhabar.com').searchParams.get('fbclid'), 'abc');
});
test('local context trusts the socket, not arbitrary forwarding headers; local cookie omits Secure', async () => {
  let sent: RequestInit | undefined;
  const request = req();
  const result = await resolveCampaignRedirect(request, 'himsagar-reel', { ...config, local: true, fetchImpl: async (_url, init) => { sent = init; return response({ clickId, destinationPath: '/', utm }); } });
  const context = JSON.parse(Buffer.from(new Headers(sent?.headers).get('x-mlbd-client-context')!.split('.')[0], 'base64url').toString());
  assert.equal(context.ip, '127.0.0.1'); assert.equal(result.cookie?.includes('Secure'), false);
});
test('click write failure retains destination/defaults without touching prior cookie', async () => {
  const result = await resolveCampaignRedirect(req(), 'himsagar-reel', { ...config, fetchImpl: async () => response({ clickId: null, destinationPath: '/product/himsagar', utm }) });
  assert.equal(result.cookie, undefined); assert.equal(result.location, '/product/himsagar?utm_source=facebook&utm_medium=campaign_link&utm_campaign=himsagar-reel');
});
test('lookup outage uses slug-only tagging and preserves incoming manual campaign', async () => {
  for (const query of ['?fbclid=abc', '?utm_campaign=manual']) {
    const result = await resolveCampaignRedirect(req(`/go/himsagar-reel${query}`), 'himsagar-reel', { ...config, fetchImpl: async () => { throw new Error('outage'); } });
    const url = new URL(result.location, 'https://www.serakhabar.com');
    assert.equal(url.pathname, '/'); assert.equal(url.searchParams.get('utm_campaign'), query.includes('manual') ? 'manual' : 'himsagar-reel');
    assert.equal(url.searchParams.has('utm_source'), false); assert.equal(result.cookie, undefined);
  }
});
test('invalid slug never calls upstream or generates a campaign tag', async () => {
  let calls = 0;
  const result = await resolveCampaignRedirect(req('/go/..??fbclid=abc'), '..', { ...config, fetchImpl: async () => { calls++; throw new Error('unexpected'); } });
  assert.equal(calls, 0); assert.equal(new URL(result.location, 'https://www.serakhabar.com').searchParams.has('utm_campaign'), false);
});
test('unsafe upstream destinations cannot set a cookie or open redirect', async () => {
  for (const destinationPath of ['//evil.test', '/go/other', '/%2f%2fevil.test', '/product/../go/other', '/product\\evil', 'https://evil.test', '/a%0d%0aX-Test:x']) {
    const result = await resolveCampaignRedirect(req(), 'himsagar-reel', { ...config, fetchImpl: async () => response({ clickId, destinationPath, utm }) });
    assert.equal(result.location, '/?utm_campaign=himsagar-reel', destinationPath); assert.equal(result.cookie, undefined);
  }
});
test('HEAD resolves without recording or setting cookies', async () => {
  let method;
  const result = await resolveCampaignRedirect(req('/go/himsagar-reel', 'HEAD'), 'himsagar-reel', { ...config, fetchImpl: async (_url, init) => { method = init?.method; return response({ clickId, destinationPath: '/', utm }); } });
  assert.equal(method, 'GET'); assert.equal(result.cookie, undefined);
});
test('two-second budget aborts stalled lookups and body reads', async () => {
  let signal: AbortSignal | undefined;
  const start = Date.now();
  const result = await resolveCampaignRedirect(req(), 'himsagar-reel', { ...config, fetchImpl: async (_url, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); } });
  assert.equal(signal?.aborted, true); assert.ok(Date.now() - start < 2500); assert.equal(result.location, '/?utm_campaign=himsagar-reel');
});
test('UTM query does not change landing-page path normalization', () => {
  assert.equal(normalizeLandingPagePath(mergeCampaignDestination('/step/katimon-mango', '?fbclid=abc', utm)), '/step/katimon-mango');
});
