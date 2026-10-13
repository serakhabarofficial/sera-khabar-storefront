# Subtle Depth Implementation Plan

> **For agentic workers:** Execute inline using executing-plans. The owner requested implementation in this session; no delegation, commit, push or deployment is required.

**Goal:** Apply the approved Subtle Depth motion to the real storefront and provide its running localhost URL.

**Architecture:** Replace the duplicated route/blur animations with one shared motion configuration and a native WAAPI driver. Framer Motion owns route presence; the shell owns crossfade and the standard layout animates only main-content transform. Standalone routes use full depth motion, and viewport-based transform origins prevent large movement on long pages. Native final styles are applied before animation release, preventing the observed hidden-start-frame flash.

**Tech Stack:** React 19, wouter, Framer Motion, TypeScript, node:test, Vite.

## Global Constraints

- Entry 260ms, exit 220ms, translate 6px, scale 0.985, ease `[0.23, 1, 0.32, 1]`.
- Reduced motion: 100ms opacity-only; respect system preference in MotionConfig.
- Animate only transform and opacity; final transform `none`; no animated filter.
- Keep header/dock outside content transform; retain existing scroll restoration and catalog snapshot.
- Do not create orders, modify secrets, push or deploy.

## Task 1: Shared motion and route/layout integration

**Files:** Create `client/src/lib/page-motion.ts`, `client/src/lib/page-motion.test.ts`, `client/src/components/page-transition.tsx`; modify `client/src/App.tsx`, `client/src/components/layout.tsx`, `client/src/components/layout.test.ts`, `client/src/main.tsx`.

**Interfaces:**

```ts
getPageMotion(reducedMotion: boolean, depth?: boolean)
getPageTransformOrigin(contentTop: number, viewportHeight: number): string
PageTransition({ children, standalone = false })
PageContentTransition({ children })
```

- [x] Add motion tests before implementation. Check depth entry/exit, reduced-motion immobility, compositor-only properties, viewport origin, and header/dock boundary.
- [x] Run `node --import tsx --test client/src/lib/page-motion.test.ts client/src/components/layout.test.ts`; observe feature failures.
- [x] Implement the motion helpers using the approved values:

```ts
const duration = reducedMotion ? 0.1 : 0.26;
const enterTransform = depth && !reducedMotion ? "translateY(6px) scale(0.985)" : "none";
const exitTransform = depth && !reducedMotion ? "scale(0.985)" : "none";
const origin = `50% ${Math.max(0, viewportHeight / 2 - contentTop)}px`;
```

- [x] Extract the existing PageTransition presence/exit-position handling. Apply shell opacity only for standard routes; full depth for standalone routes. Make absent shells inert. Measure the untransformed parent main in a layout microtask after router scroll restoration, and cancel the callback on unmount.
- [x] Replace Layout's nested wait/blur wrapper with PageContentTransition, preserving `<main>` and all surrounding chrome. Set `MotionConfig reducedMotion="user"`.
- [x] Re-run the new tests, layout/home/product/catalog tests and `npm run check`.

## Task 2: Browser verification and local handoff

**Files:** Build output only; temporary CDP verification outside the repository.

- [x] Verify the existing port 5003 listener belongs to the storefront; do not terminate another process.
- [x] Run the full existing test suite with tsx and compile the production browser bundle into the approved temporary directory without executing the catalog-refresh build script.
- [x] In actual Chrome, inspect route entry animation on refresh and click navigation. Verify transform cleanup, one settled route, route back/scroll, reduced motion, and mobile dock position.
- [x] Review the diff and ensure generated product data and runtime commerce data were not altered.
- [x] Local handoff URL ready: `http://localhost:5003/`; tested product `http://localhost:5003/product/granulated-jaggery`. Keep the server running; 6 pre-existing full-suite failures remain, with 105 focused tests passing.
