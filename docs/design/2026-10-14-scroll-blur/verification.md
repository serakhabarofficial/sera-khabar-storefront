# Skew reveal verification

Pre-publication verification completed on 2026-10-14. The owner then approved pushing to `main`, which triggers Vercel deployment. The generated catalog is byte-identical to its pre-build copy.

## Checks

- `npm run check`: passes.
- `npx tsx --test client/src/components/skew-reveal.test.ts client/src/pages/home.test.ts client/src/components/layout.test.ts client/src/lib/page-motion.test.ts client/src/lib/storefront-products.test.ts`: 75 pass, 0 fail.
- `NODE_ENV=production npm run build`: passes. Existing script async/defer and large-chunk warnings remain.
- `npx tsx --test client/src/**/*.test.ts`: 402 pass, 6 fail. The same six failures reproduce against an untouched `git archive HEAD` baseline. They concern abandoned-checkout wiring, Top Selling ordering, legacy honey-nut/kalojira build routes, legacy kalojira delivery copy and the catalog card assertion. None was changed for this animation.

## Browser checks

Checked the real local homepage in a fresh, isolated Chrome session. No browser exceptions, failed network responses or orders submitted. Desktop was 1440×900; phone checks used 390×844, 375×844 and 320×844. Accessible-name inspection used Chrome's accessibility tree; a real screen reader was not run.

| Step | Expected | Actual | Result |
| --- | --- | --- | --- |
| Refresh | Hero words reveal from 8px blur and -12° skew | Native word animations start, finish and release inline styles | PASS |
| Scroll | Lower headings wait for viewport entry, then reveal once | FAQ heading waits below fold and remains clear on scroll back | PASS |
| Back | Restore scroll and seen content without another reveal | Scroll position restored; visible headings have no word animation | PASS |
| Other routes | No homepage word effects | Products page has no skew-reveal markers, including its footer | PASS |
| Phone layout | No new clipping, overflow or broken images | All three widths pass; footer words inherit their parent font size | PASS |
| Reduced motion | No blur, rise or skew | Mid-animation preference change clears effects; reload is static | PASS |
| Missing observer | Rendered text stays visible | All words remain visible without IntersectionObserver | PASS |
| Protected controls | Prices, buttons and navigation do not acquire word effects | No word markers in these elements; shop navigation still works | PASS |
| Heading semantics | One complete Bangla heading name | Accessibility tree reports `খেজুরের পাটালী` as a heading | PASS |

## Design review

| Before | After | Why |
| --- | --- | --- |
| Whole-heading fades | Whole-word blur, rise and skew with 60ms staggering | Matches the selected preview without splitting Bangla conjuncts |
| Parent and text entrance could overlap | Display-text parents no longer receive the old section fade | Avoids dimming the same text twice |
| Memo descendants use smaller caption styling | Word spans inherit their heading's type and color | Prevents the animated footer title shrinking |
| Decorative word effects on history return | Restored, already-visible content stays still | Makes Back navigation readable immediately |

Screenshots and the CDP check script are in `/private/var/folders/ks/66d7f7mj5gb4r4cfw1wmzrjh0000gn/T/opencode/`:

- `skew-reveal-home-desktop.png`
- `skew-reveal-home-scroll-entrance.png`
- `skew-reveal-home-scroll-clear.png`
- `skew-reveal-home-history-return.png`
- `skew-reveal-home-phone-390.png`, `skew-reveal-home-phone-375.png`, `skew-reveal-home-phone-320.png`
- `skew-reveal-footer-phone.png`
- `skew-reveal-reduced-motion.png`
- `skew-reveal-observer-fallback.png`
- `skew-reveal-browser-check.mjs`
