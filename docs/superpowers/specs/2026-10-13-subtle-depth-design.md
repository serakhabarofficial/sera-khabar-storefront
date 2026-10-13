# Subtle Depth page motion

Approved by the owner on 2026-10-13 after reviewing the interactive motion variants.

## Behaviour

- Refresh and route entry: fade from 0 to 1 while settling from `translateY(6px) scale(0.985)` to `none`, in 260ms.
- Exit: fade out and recede to `scale(0.985)` in 220ms, overlapping the incoming page instead of waiting for exit.
- Ease: existing Emil Kowalski curve `cubic-bezier(0.23, 1, 0.32, 1)`.
- Reduced motion: 100ms opacity-only fade; no scaling or translation.
- Standard storefront pages scale only their main content. Header, dock, drawers and footer stay outside that transform. Standalone campaign/error routes use the same motion on their route surface.
- Anchor the scale to the visible viewport, not the middle of a long document. Final transform must be `none` so sticky content and fixed descendants retain their normal containing blocks.
- Preserve current route URLs, catalog data, cart state and scroll restoration. Exiting pages are inert and cannot intercept taps.

## Boundaries

Keep wouter and Framer Motion for simultaneous route presence and local widgets. Drive page transform/opacity with native Web Animations API, following Emil Kowalski's performance guidance. Remove the slow nested blur transition. No new dependencies, backend/API/data changes, checkout submissions, deployment or production gate changes. Use the existing local storefront at port 5003, verified to belong to this repository.

The browser reproduced a post-animation flash in the Motion component driver: after reaching opacity 1, one frame returned to opacity 0 and the starting scale. The native driver writes visible final styles before releasing its animation, avoiding that handoff. It preserves computed styles when interrupted and falls back to immediate visible content if WAAPI is unavailable.

Scroll restoration runs once before paint. Register history listeners during layout before wouter subscribes, and do not schedule the old 120–1300ms scroll retries: they overrode shopper scrolling after entry finished.

## Verification

Test motion configuration and viewport-origin calculations, existing storefront tests, TypeScript and production bundle compilation. Check the actual local site in Chrome: refresh, Home → Product, collection/info pages, browser back, rapid navigation, reduced motion, fixed mobile dock and absence of stale route layers. A desktop browser check is not a real-phone performance benchmark.

## Verified outcome

- Chrome: refresh, real product-card navigation, browser-back scroll restoration, products/collection/about routes, rapid navigation, standalone 404, reduced motion and 390px mobile dock passed. Frame samples no longer drop back to opacity 0 after completion; scrolling after the animation is no longer reset.
- 105 focused tests pass; TypeScript passes; Vite production client bundle compiles. Existing mixed-script and large-chunk build warnings remain.
- Full suite: 479 pass, 6 fail. The same 6 failures were reproduced in an untouched HEAD archive (471 pass, 6 fail); none was introduced by this change.
- No catalog snapshot, commerce data, orders, production settings or deployment changed. Local changes remain on `feat/subtle-depth-page-transitions`.
