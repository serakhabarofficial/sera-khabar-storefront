import { getCache, ipAddress, next } from '@vercel/functions';
import { createCampaignMiddleware } from './server/campaign-middleware.js';

// Vercel Routing Middleware. Only campaign links run here; every other storefront
// request skips it entirely. Node.js runtime per Vercel's edge deprecation.
export const config = { runtime: 'nodejs', matcher: ['/go/:path*'] };

export default function middleware(request: Request, context: { waitUntil(promise: Promise<unknown>): void }) {
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
