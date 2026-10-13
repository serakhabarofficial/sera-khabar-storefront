# Skew reveal implementation plan

Approved by the owner: option C, Skew reveal. Scope is the homepage display text from the preview, including its cash-memo footer title. Do not change product names, prices, stock, buttons, navigation, checkout or other page typography.

## Approach

Render words through a small React component, without editing React-owned DOM or splitting Bangla characters. Keep native heading tags and whitespace. Rendered word markup defaults to visible before motion initializes. Extend the existing page-entrance lifecycle with a Framer Motion word animator, using the same history restoration and cleanup boundary as the existing section reveals.

Motion matches the approved preview: 8px blur, 10px rise, -12° skew, 620ms custom ease-out, 60ms word stagger. The hero kicker starts immediately, with the title 70ms behind. Lower headings reveal once using a 12% inset at the bottom of the observer viewport. Already-visible content on history return stays clear. Reduced motion bypasses word effects, including when the preference changes mid-animation. Completed animations release their temporary styles.

## Files and verification

Implementation completed. Verification results are recorded in `verification.md`; the owner subsequently approved pushing to `main`.

- [x] Add `client/src/components/skew-reveal.test.ts` first. The public seam is the rendered `SkewReveal` markup: heading semantics, whole Bangla words, whitespace, visible fallback and disabled rendering for the shared footer on other routes. Run `npx tsx --test client/src/components/skew-reveal.test.ts` and confirm failure before implementation.
- [x] Add `client/src/components/skew-reveal.tsx`, then verify that rendering test passes.
- [x] Add homepage integration assertions before wiring the effect. Extend `client/src/pages/home.test.ts` and `client/src/components/layout.test.ts` to cover approved placements and the homepage-only footer. Confirm failure before implementation.
- [x] Add `client/src/lib/skew-reveal.ts`; connect it in `client/src/components/page-transition.tsx`. Use the existing resolved `back` flag, reduced-motion preference, observers and unmount cleanup. Do not change route fades or image settling.
- [x] Replace only approved display text in `client/src/pages/home.tsx` with the component. Remove competing whole-parent fades around that text. Apply the footer title only on `/` in `client/src/components/layout.tsx`.
- [x] Add scoped word styles in `client/src/poster.css`. Preserve inherited type, caption rotation, line wrapping and footer styles; provide a CSS reduced-motion fallback too.
- [x] Run type checking, rendering/integration/catalog/page-motion tests and the production build. Back up the generated catalog before the build and restore only build-produced changes, if any.
- [x] Browser-check refresh, initial and scroll entry, once-only behavior, Back navigation, live preference changes, headings' accessible names, phone/desktop layout and unchanged shop controls. Do not submit any order.
- [x] Review the complete diff, record the chosen option in the preview README and report local-only completion. The owner subsequently approved pushing to `main`.
