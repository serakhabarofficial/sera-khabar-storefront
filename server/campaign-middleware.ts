import {
  deviceFor, isBot, mergeDestination, normalizeSlug, signCookie, signReceipt,
  validateRoute, verifyPurgeSignature, visitorHash, type CampaignEvent, type CampaignRoute,
} from './campaign-edge.js';

export const CAMPAIGN_RECEIPT_HEADER = 'x-mlbd-campaign-receipt';
export const CAMPAIGN_ROUTE_TTL_SECONDS = 300;
const LOOKUP_TIMEOUT_MS = 1500;
const DELIVERY_TIMEOUT_MS = 5000;

export type CampaignRouteCache = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ttl?: number; tags?: string[] }): Promise<void>;
  expireTag(tag: string | string[]): Promise<void>;
};
export type CampaignMiddlewareDeps = {
  cache: CampaignRouteCache;
  waitUntil(promise: Promise<unknown>): void;
  // Hands the request to the existing /go rewrite and its Vercel function.
  next(): Response;
  clientIp(request: Request): string | undefined;
  merchantSuiteUrl: string;
  storefrontHandle: string;
  secret?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

const routeKey = (slug: string) => `campaign-route:v1:${slug}`;
const routeTag = (slug: string) => `campaign-${slug}`;

async function timedFetch(fetchImpl: typeof fetch, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetchImpl(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function privateJson(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Routing middleware for /go/*: answers from cached link routing data, sends the
// 302 immediately and records the click afterwards. Anything unexpected falls
// through to the existing /api/go function, which keeps the old synchronous path.
export function createCampaignMiddleware(deps: CampaignMiddlewareDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const suite = deps.merchantSuiteUrl.replace(/\/$/, '');
  const handle = encodeURIComponent(deps.storefrontHandle);

  async function loadRoute(slug: string): Promise<CampaignRoute | undefined> {
    try {
      const cached = validateRoute(await deps.cache.get(routeKey(slug)));
      if (cached) return cached;
    } catch { /* Cache misses fall back to the Suite lookup. */ }
    const response = await timedFetch(fetchImpl, `${suite}/api/public/v1/${handle}/campaign-links/${slug}/clicks`,
      { method: 'GET', headers: { Accept: 'application/json' } }, LOOKUP_TIMEOUT_MS);
    if (!response.ok) return undefined;
    const route = validateRoute(await response.json());
    if (route) {
      deps.waitUntil(deps.cache.set(routeKey(slug), route, { ttl: CAMPAIGN_ROUTE_TTL_SECONDS, tags: [routeTag(slug)] })
        .catch(() => undefined));
    }
    return route;
  }

  // The receipt cookie covers a failed delivery for buyers: checkout materializes
  // the click from it. Only retry when the Suite says the failure is temporary.
  async function deliverClick(receipt: string) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await timedFetch(fetchImpl, `${suite}/api/public/v1/${handle}/campaign-click-events`,
          { method: 'POST', headers: { [CAMPAIGN_RECEIPT_HEADER]: receipt } }, DELIVERY_TIMEOUT_MS);
        if (response.ok) return;
        if (response.status !== 503) break;
      } catch { /* Network failure: retry once. */ }
    }
    console.warn('[campaign] click delivery failed');
  }

  async function refresh(request: Request, secret: string) {
    if (request.method !== 'POST') return privateJson(405, { error: 'method_not_allowed' });
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > 2048) return privateJson(413, { error: 'request_too_large' });
    const rawBody = await request.text();
    const timestamp = request.headers.get('x-mlbd-campaign-purge-ts') || '';
    const signature = request.headers.get('x-mlbd-campaign-purge-signature') || '';
    if (!(await verifyPurgeSignature(timestamp, rawBody, signature, secret, now()))) return privateJson(401, { error: 'unauthorized' });
    let slugs: unknown;
    try { slugs = (JSON.parse(rawBody) as { slugs?: unknown }).slugs; } catch { return privateJson(400, { error: 'invalid_body' }); }
    if (!Array.isArray(slugs) || slugs.length > 20 || slugs.some(slug => typeof slug !== 'string' || !normalizeSlug(slug))) return privateJson(400, { error: 'invalid_slugs' });
    const tags = Array.from(new Set((slugs as string[]).map(slug => routeTag(normalizeSlug(slug)!))));
    try { if (tags.length) await deps.cache.expireTag(tags); }
    catch { return privateJson(503, { error: 'purge_failed' }); }
    return privateJson(202, { ok: true });
  }

  return async function campaignMiddleware(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const secret = deps.secret;
    if (!secret || secret.length < 32) return deps.next();
    if (url.pathname === '/go/_refresh') return refresh(request, secret);
    if ((request.method !== 'GET' && request.method !== 'HEAD') || url.hostname === 'serakhabar.com') return deps.next();

    let slug: string | undefined;
    try { slug = normalizeSlug(decodeURIComponent(url.pathname.slice('/go/'.length))); } catch { /* Fall through. */ }
    if (!slug) return deps.next();

    let route: CampaignRoute | undefined;
    try { route = await loadRoute(slug); } catch { route = undefined; }
    if (!route) return deps.next();

    const headers = new Headers({ Location: mergeDestination(route.destinationPath, url.search, route.utm), 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') return new Response(null, { status: 302, headers });

    const userAgent = (request.headers.get('user-agent') || '').slice(0, 400);
    const bot = isBot(userAgent);
    const clickedAt = new Date(now());
    let referrerHost: string | null = null;
    try {
      const referrer = request.headers.get('referer');
      if (referrer && referrer.length <= 2048) {
        const parsed = new URL(referrer);
        if (/^https?:$/.test(parsed.protocol) && parsed.hostname.length <= 253) referrerHost = parsed.hostname;
      }
    } catch { /* Optional bounded hint. */ }

    try {
      const ip = deps.clientIp(request);
      const dhakaDay = new Date(clickedAt.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const event: CampaignEvent = {
        v: 1, handle: deps.storefrontHandle, linkId: route.linkId, clickId: crypto.randomUUID(), clickedAt: clickedAt.toISOString(),
        isBot: bot, visitorHash: ip && /^[0-9a-f:.]{3,45}$/i.test(ip) ? await visitorHash(secret, dhakaDay, ip, userAgent) : null,
        referrerHost, device: deviceFor(userAgent),
      };
      const receipt = await signReceipt(event, secret);
      deps.waitUntil(deliverClick(receipt));
      if (!bot) {
        const cookie = await signCookie(event.clickId, secret);
        headers.append('Set-Cookie', `ml_cclick=${cookie}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
        headers.append('Set-Cookie', `ml_cproof=${receipt}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
      }
    } catch {
      // Signing failed: the visitor still lands on the right page, without a new click.
    }
    return new Response(null, { status: 302, headers });
  };
}
