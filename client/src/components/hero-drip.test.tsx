import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HERO_DRIP_VIDEO, HeroDrip } from "./hero-drip.tsx";

test("the drip loop is never part of the first render, so the hero photo paints first", () => {
  assert.equal(renderToStaticMarkup(<HeroDrip />), "");
});

test("the drip loop ships under a versioned name as a transparent WebM", () => {
  assert.match(HERO_DRIP_VIDEO, /^\/home\/hero-jaggery-drip-\d+\.webm$/);
  const file = readFileSync(new URL(`../../public${HERO_DRIP_VIDEO}`, import.meta.url));
  assert.ok(file.length < 150_000, `${file.length} bytes is too heavy for a hero overlay`);
  // EBML header, and the Matroska "AlphaMode" element (0x53C0) the transparent render carries.
  assert.equal(file.subarray(0, 4).toString("hex"), "1a45dfa3");
  assert.ok(file.includes(Buffer.from([0x53, 0xc0])), "the video has no alpha channel");
});
