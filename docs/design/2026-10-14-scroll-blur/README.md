# Scroll blur motion preview

The owner selected option C, Skew reveal, and approved publishing it to the storefront's `main` branch. The local preview file is design exploration only and is not part of the production commit.

The owner's reference is https://github.com/codrops/ScrollBlurTypography. This preview applies Emil Kowalski's restrained motion guidance to an inert snapshot of the current Sera Khabar homepage. The layout, typography, photos and catalog remain the same for a fair motion comparison.

- A, Soft reveal: 6px blur, 8px rise, 480ms ease-out, 45ms word stagger. Plays once per refresh.
- B, Scroll linked: 8px blur, a small rise, word staggering driven directly by scroll position. Reverses when scrolling up, like the Codrops reference. The hero still plays on refresh.
- C, Skew reveal: 8px blur, 10px rise, gentle -12° skew, 620ms ease-out, 60ms word stagger. Plays once per refresh.

Bangla words are never split into characters. Only display text animates. Navigation, checkout buttons, product names, prices and stock stay readable. Operating-system reduced motion and the preview's Reduce motion button bypass these effects.

## Open locally

Keep the existing storefront dev server running on port 5003. Open this file through Vite's local-only `/@fs/` handler:

```text
http://localhost:5003/@fs/Users/noorkarimmehedi/Sera%20Khabar%20-%20%E0%A6%B8%E0%A7%87%E0%A6%B0%E0%A6%BE%20%E0%A6%96%E0%A6%BE%E0%A6%AC%E0%A6%BE%E0%A6%B0/sera-khabar-storefront/docs/design/2026-10-14-scroll-blur/scroll-blur-prototype.html?variant=A
```

Use the bottom switcher or left/right arrow keys. Desktop and Phone change the preview width. Refresh preview recaptures the page and replays its entrance. Scroll inside the homepage to compare the section headings.

The source page renders once to provide the snapshot. Its scripts are removed before motion starts; shop links and forms are inert. No order, cart, catalog or database mutations are wired to this mockup. The preview adds no dependencies or production routes and does not modify application files.

Decision: option C, Skew reveal, approved on 2026-10-14. The production implementation uses React-owned whole-word spans and Framer Motion's native DOM animator, integrated with the existing page-entrance lifecycle. The prototype itself remains separate from application code. See `implementation-plan.md` and `verification.md`.

## Preview verification

Checked in a fresh local Chrome session at desktop 1440×1000 and phone 390×844: all three effects, scroll-linked reversal, replay, browser refresh, keyboard switching, inert shop links, both reduced-motion controls, image loading and horizontal overflow. No browser exceptions or failed network responses. Screenshots are in the session's temporary directory, not production assets.

Before implementation, `npm run check` and all 12 then-existing `node --test client/src/pages/home.test.ts` tests passed. No production build was needed for that docs-only preview. Current implementation checks are recorded separately in `verification.md`.
