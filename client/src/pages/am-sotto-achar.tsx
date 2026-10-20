import { useCallback, useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveLandingCheckoutStatus } from "@/features/landing/checkout-state";
import { getLandingPackOptions } from "@/features/landing/order";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { STOREFRONT_CATALOG_QUERY_OPTIONS, STOREFRONT_POLL_INTERVAL_MS, fetchStorefrontProduct, fetchStorefrontProductInventory, findGeneratedStorefrontProduct, mergeInventory } from "@/lib/storefront-products";
import { AmsottoHero } from "@/features/am-sotto-achar/hero";
import { TasteSpotlight } from "@/features/am-sotto-achar/taste-spotlight";
import { RecipeMotion } from "@/features/am-sotto-achar/recipe-motion";
import { AmsottoCheckout } from "@/features/am-sotto-achar/amsotto-checkout";
import { AmsottoFooter } from "@/features/am-sotto-achar/footer";
import { AMSOTTO_CANVAS, AMSOTTO_SLUG, reducedMotion, taka } from "@/features/am-sotto-achar/content";
import "@/features/am-sotto-achar/am-sotto-achar.css";

export default function AmSottoAcharPage() {
  const root = useRef<HTMLDivElement>(null);
  const focusTimer = useRef(0);
  const generatedProduct = findGeneratedStorefrontProduct(generatedStorefrontProducts, AMSOTTO_SLUG);
  const productQuery = useQuery({ ...STOREFRONT_CATALOG_QUERY_OPTIONS, queryKey: ["merchant-suite-product", AMSOTTO_SLUG], queryFn: () => fetchStorefrontProduct(AMSOTTO_SLUG), initialData: generatedProduct ?? undefined, refetchInterval: STOREFRONT_POLL_INTERVAL_MS });
  const inventoryQuery = useQuery({ queryKey: ["merchant-suite-inventory", AMSOTTO_SLUG], queryFn: () => fetchStorefrontProductInventory(AMSOTTO_SLUG), refetchInterval: STOREFRONT_POLL_INTERVAL_MS });
  const product = mergeInventory(productQuery.data, inventoryQuery.data?.inventory);
  const packs = product ? getLandingPackOptions(product) : [];
  const firstPack = [...packs].sort((a, b) => a.unitPrice - b.unitPrice)[0];
  const status = resolveLandingCheckoutStatus({ hasProduct: Boolean(product), hasOrderablePacks: packs.length > 0, productIsPending: productQuery.isPending, productIsError: productQuery.isError, inventoryIsError: inventoryQuery.isError, inventoryIsFetched: inventoryQuery.isFetched, hasInventory: Boolean(inventoryQuery.data?.inventory) });
  const scrollToOrder = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    root.current?.querySelector("#v1-order")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => document.getElementById("amsotto-checkout-heading")?.focus({ preventScroll: true }), reducedMotion() ? 0 : 450);
  }, []);
  // Paint the canvas behind the page and the phone's browser bars in the hero's cream, so the
  // status bar, overscroll and safe areas match the hero. Restored when leaving the landing.
  useLayoutEffect(() => {
    const html = document.documentElement, body = document.body;
    const previous = [html.style.backgroundColor, body.style.backgroundColor];
    html.style.backgroundColor = body.style.backgroundColor = AMSOTTO_CANVAS;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta, previousTheme = meta?.content;
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.append(meta); }
    meta.content = AMSOTTO_CANVAS;
    return () => {
      [html.style.backgroundColor, body.style.backgroundColor] = previous;
      if (created) meta!.remove(); else meta!.content = previousTheme ?? "";
    };
  }, []);
  useEffect(() => {
    const el = root.current!, bar = el.querySelector<HTMLElement>(".v1-bar")!;
    // The bar steps aside over the order memo and the footer, so the footer needs no room for it.
    let heroGone = false, orderIn = false, footerIn = false;
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.target.matches("[data-hero]")) heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      else if (entry.target.matches("footer")) footerIn = entry.isIntersecting;
      else orderIn = entry.isIntersecting;
      bar.classList.toggle("show", heroGone && !orderIn && !footerIn);
    }), { threshold: 0 });
    io.observe(el.querySelector("[data-hero]")!);
    io.observe(el.querySelector("#v1-order")!);
    io.observe(el.querySelector("footer")!);
    return () => { io.disconnect(); clearTimeout(focusTimer.current); };
  }, []);
  return <div ref={root} className="amsotto">
    <main>
      <AmsottoHero onOrderClick={scrollToOrder} price={firstPack?.unitPrice} packLabel={firstPack?.label} />
      <TasteSpotlight />
      <RecipeMotion />
      <section className="v1-order" id="v1-order" aria-labelledby="amsotto-checkout-heading"><AmsottoCheckout product={product} status={status} productQuery={productQuery} inventoryQuery={inventoryQuery} onRetry={() => void Promise.all([productQuery.refetch(), inventoryQuery.refetch()])} /></section>
    </main>
    <AmsottoFooter />
    <div className="v1-bar" aria-hidden="true"><p>আমসত্ত্ব আচার<b className="num">{firstPack ? `${taka(firstPack.unitPrice)} থেকে` : "ক্যাশ অন ডেলিভারি"}</b></p><a className="v1-btn sm" href="#v1-order" onClick={scrollToOrder} tabIndex={-1}>অর্ডার করুন</a></div>
  </div>;
}
