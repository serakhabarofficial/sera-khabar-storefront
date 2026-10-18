# Sera Khabar Storefront — Setup Handoff

> **For the AI agent:** this repo is a **copy of the Mango Lover BD storefront**
> being set up for a new, separate merchant: **Sera Khabar**. The full step-by-step
> plan covering both repos is in
> `/Users/noorkarimmehedi/Sera Khabar - সেরা খাবার/sera-khabar-commerceos/SERA_KHABAR_SETUP.md` (Phase 7 there). Read that first,
> including its safety rules. This file lists only the storefront-specific work.
> It overrides any Mango Lover text in `CLAUDE.md` / `README.md`.

Written 2026-10-12. First pushed to `serakhabarofficial/sera-khabar-storefront` from
Mango Lover commit `5c06ac6` with `--no-verify`; later pushes pass the hook normally.

## Status (updated 2026-10-12)

The latest status and to-do list for both repos are in the Suite's `handoff.md`.

**Done**
- **Safety rebrand:** Suite URL, handle (`serakhabar`), workspace id, contact details, logo, icons and hero changed to Sera Khabar. Mango Lover GTM/Pixel, reels, product snapshot and comparison art removed.
- **Live:** deployed via the Suite's Provision Storefront to https://serakhabar-storefront.vercel.app (Vercel project `storefront-690aa8b3`).
- **Launched (2026-10-18):** the pre-launch password gate and the founder's letter page were removed from the code, so the shop is public. The Vercel env var `SITE_ACCESS_PASSWORD` no longer does anything and can be deleted.

**Left**
- **Design:** colours/layout are still Mango Lover's (yellow), some Mango Lover homepage/category images remain, and the `/step/*` campaign pages need removing or reworking. **The homepage redesign is approved but not built (2026-10-13):** read `docs/design/2026-10-13-homepage/README.md` and open its `homepage-mockup.html` (palette তেঁতুল + হলুদ, Noto Serif Bengali titles, Atma digits, coloured-card categories for ফ্রেশ আম/হোমমেড/গুড় only, cash-memo footer with the Arc Labs credit).
- **Domain (Phase 9):** move the hardcoded Suite URL `https://sera-khabar-commerceos.vercel.app` to `https://admin.serakhabar.com` (files listed in the Suite's `handoff.md`).
- **Test order:** place one through the shop.

Run storefront tests with `npx tsx --test <file>`; plain `node --test` can't resolve this repo's `.js` import specifiers (45 old tests fail that way).

## Safety

- Never touch `mangoloverbd/mangoloverbd_storefront`, the Mango Lover folder, or `~/merchant-b` (old temp copy).
- Work only in `/Users/noorkarimmehedi/Sera Khabar - সেরা খাবার/sera-khabar-storefront` (quote the path, it has spaces).
- Before pushing: `gh auth status` must show active `serakhabarofficial`, and
  `git remote -v` must show only `serakhabarofficial/sera-khabar-storefront`.
- The MCP configs (`.mcp.json`, `.codex/config.toml`) point at Sera Khabar's Supabase
  `xnuiaxygeoydtopvcmli`. Never point them at `ldiktvcavyabivpxfwpn` (Mango Lover).

## Prerequisites (from the Suite handoff)

You need these first: the Sera Khabar Suite URL, the storefront handle, the new
workspace id (`select org_id from user_roles;` in Sera Khabar's Supabase), the
Sera Khabar Supabase ref, the domain, the brand name and logo, and GTM/GA4 IDs (or none).

## Mango Lover values hardcoded here (found 2026-10-12)

**Critical: without these changes the storefront shows Mango Lover's products and sends orders/analytics to Mango Lover.**

| File | Mango Lover value | Replace with |
|---|---|---|
| `script/build.ts:12` | default storefront id `2a155750-b11a-4ff2-a7ff-4e26daac46ef` | Sera Khabar workspace id (or read from env only) |
| `script/build.ts:15` | production Suite URL `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `middleware.ts:14-15` | `merchantSuiteUrl: 'https://admin.mangolover.com.bd'`, `storefrontHandle: 'mangoloverbd'` | Sera Khabar values |
| `server/order-service.ts:89` | `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `server/abandoned-cart-service.ts:149` | `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `server/campaign-links.ts:5, 86, 99` | `https://www.mangolover.com.bd`, handle `'mangoloverbd'`, admin URL | Sera Khabar values |
| `server/campaign-edge.ts:4` | `https://www.mangolover.com.bd` | Sera Khabar storefront URL |
| `server/campaign-middleware.ts:104` | apex hostname `mangolover.com.bd` | Sera Khabar apex domain |
| `vercel.json:152` | image host `ldiktvcavyabivpxfwpn.supabase.co` | `<new-ref>.supabase.co` |
| `client/index.html` | GTM `GTM-5KKTRHFD`, title/OG tags "ম্যাংগো লাভার - Mango Lover", `www.mangolover.com.bd` | Sera Khabar GTM (or remove), brand, domain |
| `client/src/App.tsx:28-36`, `client/src/components/layout.tsx` (~532, 672, 718), `api/legacy-gone.ts:9` | Bangla brand name ম্যাংগো লাভার | Sera Khabar brand |
| `client/src/lib/generated-storefront-products.ts` | **generated snapshot of Mango Lover's products** | regenerate from Sera Khabar's Suite at build time, or empty it |
| `client/src/features/*` (e.g. `kalojira-mixed/bori-content.ts`) and curated product/landing content | Mango Lover-specific products, images, pages | remove or replace with Sera Khabar content |
| `.env.example` | Mango Lover workspace id `3cd26e57-…` | Sera Khabar values |
| `public/` / `client/public/` | logos, favicon, OG images | Sera Khabar branding |
| `CLAUDE.md`, `README.md` | Mango Lover docs, Vercel project `mangoloverbd`, Supabase ref | Sera Khabar |
| `*.test.ts` (campaign-links, campaign-middleware, order-service, analytics-session, vite-plugin-merchant-suite-tracker) | `mangoloverbd`, `mangolover.com.bd` | update so tests pass |

Final sweep, where only historical `docs/` may still match:

```bash
grep -rniE "mangolover|mango lover|ম্যাংগো|ldiktvcavyabivpxfwpn|3cd26e57|2a155750|GTM-5KKTRHFD|G-Q7J7KV6ZVC" . --exclude-dir={node_modules,dist,.git,docs}
```

Check the design too (colors, copy, hero images); ask the user how Sera Khabar should look.

## Env vars used by this storefront

`VITE_MERCHANT_SUITE_URL`, `MERCHANT_SUITE_URL`, `VITE_STOREFRONT_ID`,
`STOREFRONT_HANDLE`, `CUSTOM_ORDERS_API_KEY` (server-only, never `VITE_`),
`STOREFRONT_CONTEXT_SECRET`, `CAMPAIGN_EDGE_SECRET`, `CRON_SECRET` (these three must
match the Sera Khabar Suite), `VITE_TURNSTILE_SITE_KEY` (optional), `DATABASE_URL` (check whether it's still used).

## Done when

- [x] `npm run build` passes with Sera Khabar env vars; the hook passes on push (no `--no-verify`)
- [x] Deployed via the Suite's **Provision Storefront**, on the new Vercel account
- [ ] Shows only Sera Khabar products ✅; a test order lands in the Sera Khabar Suite (still to do)
- [ ] `www` domain is DNS-only (grey cloud) in the new Cloudflare account

## Step-by-step order (Phase 7 of the main guide)

1. Confirm the prerequisites above are filled in the main guide's **Key facts** table. If not, finish Phases 3–6 first.
2. `cd "/Users/noorkarimmehedi/Sera Khabar - সেরা খাবার/sera-khabar-storefront"`, `npm ci` if `node_modules` is missing, then `git checkout -b chore/sera-khabar-rebrand`.
3. Replace the Supabase placeholder `SERA_KHABAR_SUPABASE_REF` in `.mcp.json` and `.codex/config.toml` with Sera Khabar's ref.
4. Fix the **critical runtime values** first (`script/build.ts`, `middleware.ts`, `server/order-service.ts`, `server/abandoned-cart-service.ts`, `server/campaign-*.ts`, `vercel.json` image host). Prefer reading the Suite URL and handle from env vars (`MERCHANT_SUITE_URL`, `STOREFRONT_HANDLE`, `VITE_STOREFRONT_ID`) instead of new hardcoded literals, but keep changes small.
5. Remove Mango Lover's GTM from `client/index.html` (or replace it with Sera Khabar's ID), and fix the title/OG/meta tags.
6. Replace the brand name and logos in the client (`App.tsx`, `layout.tsx`, `api/legacy-gone.ts`, `public/` assets from `$BASE/brand-assets/`).
7. Handle `client/src/lib/generated-storefront-products.ts`: regenerate it from the Sera Khabar Suite (see how `script/build.ts` writes it) or reset it to an empty snapshot.
8. Remove or replace Mango-Lover-specific product, landing and feature pages (`client/src/features/*`, curated product content). Ask the user what Sera Khabar needs.
9. Ask the user about the design (colors, fonts, homepage sections) and apply it.
10. Rewrite `CLAUDE.md` and `README.md` for Sera Khabar (keep the top banner until go-live). Update `.env.example`.
11. Update the tests listed above, then run the sweep grep. Only `docs/` may match.
12. Create a local `.env` (never commit it) with `VITE_MERCHANT_SUITE_URL` and `MERCHANT_SUITE_URL` = the Sera Khabar Suite URL, `VITE_STOREFRONT_ID` = Sera Khabar org_id, `STOREFRONT_HANDLE` / `VITE_STOREFRONT_HANDLE` = the handle. Then `npm run build` and `npm test` must pass.
13. Commit `chore: rebrand storefront for Sera Khabar`. Do the GitHub account check (`gh auth status` → `serakhabarofficial`; `git remote -v`), then push **with** the pre-push hook (no `--no-verify`) and merge to `main`.
14. Go back to the main guide, **Phase 8** (Provision Storefront).
