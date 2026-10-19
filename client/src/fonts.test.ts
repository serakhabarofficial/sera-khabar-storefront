import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Geist became the storefront's only Latin/English face on 2026-10-13 (see the
// "one Latin face" note in client/src/index.css). These are source-text tests,
// matching the convention used by the other suites in this repo.

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const indexCss = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const posterCss = readFileSync(new URL("./poster.css", import.meta.url), "utf8");
const honeyCss = readFileSync(new URL("./features/honey-nut/campaign.css", import.meta.url), "utf8");
const kalojiraCss = readFileSync(new URL("./features/kalojira-mixed/campaign.css", import.meta.url), "utf8");

const styles = { "index.css": indexCss, "poster.css": posterCss, "honey-nut/campaign.css": honeyCss, "kalojira-mixed/campaign.css": kalojiraCss };

test("Geist is the only Latin face loaded from the network", () => {
  // The variable range is required: rules such as .skc-title and .sko-title ask for
  // weight 900, which a 400-700 subset would fake-bold.
  assert.match(html, /family=Geist:wght@100\.\.900/);

  for (const retired of ["Inter", "Cormorant+Garamond", "Space+Grotesk"]) {
    assert.doesNotMatch(html, new RegExp(`family=${retired}`), `${retired} is no longer loaded`);
  }
});

test("the Tailwind font tokens all resolve to Geist", () => {
  assert.match(indexCss, /--font-sans: 'Geist', sans-serif;/);
  assert.match(indexCss, /--font-display: 'Geist', serif;/);
  assert.match(indexCss, /--font-modern: 'Geist', sans-serif;/);
  assert.match(indexCss, /--font-garet: 'Geist', sans-serif;/);
});

test("no stylesheet declares a retired Latin face", () => {
  for (const [name, source] of Object.entries(styles)) {
    for (const retired of ["'Inter'", '"Inter"', "Cormorant", "Space Grotesk", "Inter28pt"]) {
      assert.doesNotMatch(source, new RegExp(retired.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${name} still references ${retired}`);
    }
  }
});

test("the Bengali faces are all still present", () => {
  // Geist covers Latin only, so every Bangla face has to survive the swap.
  assert.match(html, /family=Noto\+Serif\+Bengali:wght@300;400;500;600;700;800;900/);
  assert.match(html, /family=Galada/);

  assert.match(indexCss, /font-family: 'GaretBook';/);
  assert.match(indexCss, /font-family: 'KaiumSimanto';/);
  assert.match(indexCss, /font-family: 'IhtishamDeshlipi';/);
  assert.match(indexCss, /font-family: 'ShohidAbuSayed';/);

  // Galada stays the script accent.
  assert.match(posterCss, /\.sk \.script \{ font-family: "Galada"/);
});

test("numerals use Geist with a Bangla fallback, and Atma is retired", () => {
  // Geist ships no Bengali subset, so ০-৯ (U+09E6-09EF) fall through to Noto Serif
  // Bengali while Latin digits stay Geist. Tabular figures keep prices in a column aligned.
  assert.match(posterCss, /\.sk \.num \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  assert.match(posterCss, /\.skp \.num \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  assert.match(posterCss, /\.sk \.c-price \{[^}]*font-variant-numeric: tabular-nums;/);

  const numeralRules = posterSource_numeralRules();
  // 15 since the English cart (2026-10-20): its prices are Latin digits in plain Geist, so the cart's rules left this set.
  assert.ok(numeralRules.length >= 15, `expected the numeral face across every rule, found ${numeralRules.length}`);
  for (const rule of numeralRules) {
    assert.match(rule, /font-family: "Geist", "Noto Serif Bengali", serif;/);
  }

  // Atma is no longer loaded or referenced anywhere.
  assert.doesNotMatch(html, /family=Atma/);
  assert.doesNotMatch(posterCss, /"Atma"/);
  assert.doesNotMatch(indexCss, /Atma/);
});

// Every rule that used to carry the numeral face, so a new one cannot silently keep Atma.
function posterSource_numeralRules() {
  return posterCss
    .split("}")
    .filter((rule) => rule.includes('"Geist", "Noto Serif Bengali", serif; font-variant-numeric'))
    .map((rule) => rule.slice(rule.lastIndexOf("{") + 1).trim());
}

test("poster and campaign roots lead with Geist and keep Noto Serif Bengali behind it", () => {
  assert.match(posterCss, /\.sk \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  assert.match(posterCss, /\.skp \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  assert.match(honeyCss, /\.honey-nut-page \{[^}]*font-family: "Geist", "Noto Serif Bengali", system-ui, serif;/);
  assert.match(kalojiraCss, /\.kalojira-mixed-page \{[^}]*font-family: "Geist", "Noto Serif Bengali", system-ui, serif;/);
});