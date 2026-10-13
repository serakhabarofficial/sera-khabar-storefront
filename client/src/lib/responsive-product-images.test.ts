import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildProductSrcSet,
  buildProductSrcSetIndex,
  getProductImage,
  getProductImageSet,
} from "./storefront-products.ts";
import { generatedStorefrontProducts } from "./generated-storefront-products.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const sources = { "320": "a/320.webp", "640": "a/640.webp", "960": "a/960.webp" };

test("builds a width-descriptor srcSet from the Suite's variants", () => {
  assert.equal(
    buildProductSrcSet(sources),
    "a/320.webp 320w, a/640.webp 640w, a/960.webp 960w",
  );
});

test("omits a srcSet that offers the browser no choice", () => {
  assert.equal(buildProductSrcSet(undefined), undefined);
  assert.equal(buildProductSrcSet({}), undefined);
  assert.equal(buildProductSrcSet({ "960": "a/960.webp" }), undefined);
});

test("skips missing widths instead of emitting empty candidates", () => {
  assert.equal(
    buildProductSrcSet({ "320": "a/320.webp", "960": "a/960.webp" }),
    "a/320.webp 320w, a/960.webp 960w",
  );
});

test("the srcSet always describes the image getProductImage displays", () => {
  const product = {
    image_url: "a/960.webp",
    images: [{ url: "a/960.webp", sources }],
  };

  const set = getProductImageSet(product);
  assert.equal(set.src, getProductImage(product));
  assert.equal(set.srcSet, "a/320.webp 320w, a/640.webp 640w, a/960.webp 960w");
});

test("products without variants keep their original single-URL behaviour", () => {
  const legacy = { image_url: "legacy.jpg", images: null };
  const set = getProductImageSet(legacy);

  assert.equal(set.src, "legacy.jpg");
  assert.equal(set.srcSet, undefined);
});

test("an image with no url at all yields an empty set, not a broken tag", () => {
  assert.deepEqual(getProductImageSet({ image_url: null, images: [] }), { src: "" });
});

test("indexes srcSets by url for flat galleries", () => {
  const index = buildProductSrcSetIndex({
    images: [{ url: "a/960.webp", sources }, { url: "b/960.webp" }],
  });

  assert.equal(index["a/960.webp"], "a/320.webp 320w, a/640.webp 640w, a/960.webp 960w");
  assert.equal(index["b/960.webp"], undefined);
  assert.deepEqual(buildProductSrcSetIndex(null), {});
});

// Image variants are merchant data, not repo code — a product uploaded before
// the resize pipeline (or through an older path) simply has no `sources`. That
// must degrade to the original URL rather than render a broken tag, so the
// contract under test is the fallback, not the data.
test("every live product resolves to a usable image either way", () => {
  for (const product of generatedStorefrontProducts) {
    const set = getProductImageSet(product);
    assert.equal(set.src, getProductImage(product), `${product.slug} changed image`);
    if (set.src) {
      assert.ok(set.srcSet === undefined || set.srcSet.includes("320w"), `${product.slug} bad srcSet`);
    }
  }
});

test("reports which products still need the image variant backfill", () => {
  const needsBackfill = generatedStorefrontProducts
    .filter((product) => getProductImage(product) && !getProductImageSet(product).srcSet)
    .map((product) => product.slug);

  // Not a failure: these still render, just at full size. Run
  // scripts/backfill-product-image-variants.mjs in the Suite to fix them.
  if (needsBackfill.length) {
    console.log(`  ℹ ${needsBackfill.length} product(s) awaiting variant backfill: ${needsBackfill.join(", ")}`);
  }

  // An empty snapshot (fresh Sera Khabar catalog) has nothing to backfill.
  assert.ok(
    generatedStorefrontProducts.length === 0 || needsBackfill.length < generatedStorefrontProducts.length,
    "no product has image variants — the backfill never ran",
  );
});

test("card images ship a srcSet and a sizes hint", () => {
  for (const path of [
    "../components/home-product-card.tsx",
    "../components/product-grid.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /getProductImageSet\(/, `${path} must resolve variants`);
    assert.match(source, /srcSet=\{imageSrcSet\}/, `${path} must set srcSet`);
    assert.match(source, /sizes=\{imageSrcSet \?/, `${path} must set sizes`);
    assert.doesNotMatch(source, /getProductImage\(/, `${path} must not bypass the variant lookup`);
  }
});

test("small fixed-size thumbnails pin sizes so they cannot pull the 960px file", () => {
  assert.match(read("../components/layout.tsx"), /sizes=\{srcSet \? "40px" : undefined\}/);
  assert.match(read("../pages/product.tsx"), /sizes=\{srcSetFor\[displayImage\] \? "44px" : undefined\}/);
});
