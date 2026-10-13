import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const componentSource = readFileSync(new URL("./recently-viewed.tsx", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

// Restyled 2026-10-13 to match the homepage and the product page.
test("renders homepage poster cards in a scrolling row with round arrows", () => {
  assert.match(componentSource, /useRecentlyViewedSlugs/);
  assert.match(componentSource, /getRecentlyViewedProducts/);
  assert.match(componentSource, /<PosterProductCard key=\{product\.slug\} product=\{product\} \/>/);
  assert.doesNotMatch(componentSource, /HomeProductCard/);
  assert.match(componentSource, /সম্প্রতি দেখা/);
  assert.match(componentSource, /<section className=\{`sk rv/);
  assert.match(componentSource, /aria-label="Previous recently viewed products"/);
  assert.match(componentSource, /aria-label="Next recently viewed products"/);
  assert.match(componentSource, /aria-controls="recently-viewed-products"/);
  assert.match(posterSource, /\.sk \.rv-rail \{[^}]*scroll-snap-type: x mandatory/);
});
