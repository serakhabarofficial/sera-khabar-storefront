import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { COMING_SOON_HTML } from './coming-soon-page.js';

// Pre-launch gate. While SITE_ACCESS_PASSWORD is set, every visitor sees the
// coming-soon letter; the team unlocks the real shop with the password, which
// sets a signed cookie for 30 days. Delete the env var to launch.
export const SITE_ACCESS_COOKIE = 'sk_site_access';
export const SITE_ACCESS_PATH = '/api/site-access';
export const COMING_SOON_ASSETS = '/coming-soon/';
export const SITE_ACCESS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const FAILED_ATTEMPT_DELAY_MS = 400;

export type SiteAccessOptions = {
  password?: string;
  // Mixed into the signing key so a leaked cookie format alone is not enough.
  secret?: string;
  now?: () => number;
  delay?: (ms: number) => Promise<void>;
};

const signingKey = (password: string, secret = '') => `site-access-v1:${password}:${secret}`;

export function signSiteAccess(expiresAt: number, password: string, secret?: string): string {
  const mac = createHmac('sha256', signingKey(password, secret)).update(String(expiresAt)).digest('hex');
  return `${expiresAt}.${mac}`;
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

function sameString(a: string, b: string): boolean {
  // Hash first so the comparison is constant-time regardless of length.
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export function hasSiteAccess(cookieHeader: string | null, password: string, secret: string | undefined, now: number): boolean {
  const value = readCookie(cookieHeader, SITE_ACCESS_COOKIE);
  const expiresAt = Number(value?.split('.')[0]);
  if (!value || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  return sameString(value, signSiteAccess(expiresAt, password, secret));
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

async function readPassword(request: Request): Promise<string> {
  try {
    const body = await request.json() as { password?: unknown };
    return typeof body?.password === 'string' ? body.password : '';
  } catch {
    return '';
  }
}

// Returns a Response when the gate answers the request itself, or undefined to
// let the request continue to the shop.
export async function siteAccessGate(request: Request, options: SiteAccessOptions): Promise<Response | undefined> {
  const { password, secret } = options;
  if (!password) return undefined;
  const now = options.now?.() ?? Date.now();
  const { pathname } = new URL(request.url);

  if (pathname === SITE_ACCESS_PATH) {
    if (request.method !== 'POST') return json(405, { ok: false }, { Allow: 'POST' });
    if (!sameString(await readPassword(request), password)) {
      await (options.delay ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(FAILED_ATTEMPT_DELAY_MS);
      return json(401, { ok: false });
    }
    const expiresAt = now + SITE_ACCESS_MAX_AGE_SECONDS * 1000;
    const cookie = `${SITE_ACCESS_COOKIE}=${signSiteAccess(expiresAt, password, secret)}; Max-Age=${SITE_ACCESS_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
    return json(200, { ok: true }, { 'Set-Cookie': cookie });
  }

  // The letter's own images, and the Suite's signed campaign cache refresh.
  if (pathname.startsWith(COMING_SOON_ASSETS) || pathname === '/go/_refresh') return undefined;

  if (pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  if (hasSiteAccess(request.headers.get('cookie'), password, secret, now)) return undefined;

  if (pathname.startsWith('/api/')) return json(401, { ok: false, error: 'Site is not open yet' });

  return new Response(COMING_SOON_HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '86400',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
