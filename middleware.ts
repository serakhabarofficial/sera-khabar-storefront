import { getCache, ipAddress, next } from '@vercel/functions';
import { createCampaignMiddleware } from './server/campaign-middleware.js';
import { siteAccessGate } from './server/site-access.js';

// Vercel Routing Middleware. Runs on every request so the pre-launch gate
// (SITE_ACCESS_PASSWORD) can cover the whole site; campaign links under /go
// then run as before. Node.js runtime per Vercel's edge deprecation.
export const config = { runtime: 'nodejs', matcher: ['/:path*'] };

export default async function middleware(request: Request, context: { waitUntil(promise: Promise<unknown>): void }) {
  const gated = await siteAccessGate(request, {
    password: process.env.SITE_ACCESS_PASSWORD,
    secret: process.env.STOREFRONT_CONTEXT_SECRET,
  });
  if (gated) return gated;

  if (!new URL(request.url).pathname.startsWith('/go/')) return next();

  return createCampaignMiddleware({
    cache: getCache({ namespace: 'mlbd-campaign' }),
    waitUntil: promise => context.waitUntil(promise),
    next: () => next(),
    clientIp: req => ipAddress(req),
    merchantSuiteUrl: 'https://sera-khabar-commerceos.vercel.app',
    storefrontHandle: 'serakhabar',
    secret: process.env.CAMPAIGN_EDGE_SECRET,
  })(request);
}
