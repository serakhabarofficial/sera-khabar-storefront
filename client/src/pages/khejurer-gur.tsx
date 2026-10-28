import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useQueries } from "@tanstack/react-query";
import { resolveLandingCheckoutStatus } from "@/features/landing/checkout-state";
import { getLandingPackOptions, type LandingPackOption } from "@/features/landing/order";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { STOREFRONT_CATALOG_QUERY_OPTIONS, STOREFRONT_POLL_INTERVAL_MS, fetchStorefrontProduct, fetchStorefrontProductInventory, findGeneratedStorefrontProduct, mergeInventory } from "@/lib/storefront-products";
import { GurHero, GurQuote, GurStory, type GurShelfItem } from "@/features/khejurer-gur/story";
import { GurCheckout, type GurLines, type GurOffer } from "@/features/khejurer-gur/gur-checkout";
import { GurFooter } from "@/features/khejurer-gur/footer";
import { PILL_LOTUS } from "@/features/khejurer-gur/alpona";
import { GUR_CANVAS, GUR_PRODUCTS, reducedMotion, taka } from "@/features/khejurer-gur/content";
import "@/features/am-sotto-achar/am-sotto-achar.css";
import "@/features/khejurer-gur/khejurer-gur.css";

export default function KhejurerGurPage() {
  const root = useRef<HTMLDivElement>(null);
  const focusTimer = useRef(0), toastTimer = useRef(0);
  const [toast, setToast] = useState("");
  const productQueries = useQueries({ queries: GUR_PRODUCTS.map(({ slug }) => ({ ...STOREFRONT_CATALOG_QUERY_OPTIONS, queryKey: ["merchant-suite-product", slug], queryFn: () => fetchStorefrontProduct(slug), initialData: findGeneratedStorefrontProduct(generatedStorefrontProducts, slug) ?? undefined, refetchInterval: STOREFRONT_POLL_INTERVAL_MS })) });
  const inventoryQueries = useQueries({ queries: GUR_PRODUCTS.map(({ slug }) => ({ queryKey: ["merchant-suite-inventory", slug], queryFn: () => fetchStorefrontProductInventory(slug), refetchInterval: STOREFRONT_POLL_INTERVAL_MS })) });
  const offers = GUR_PRODUCTS.map((meta, i): GurOffer => {
    const productQuery = productQueries[i], inventoryQuery = inventoryQueries[i];
    const product = mergeInventory(productQuery.data, inventoryQuery.data?.inventory);
    // Smallest pack first (৫০০ গ্রাম before ১ কেজি), whatever order the catalog lists variants in.
    const packs = product ? getLandingPackOptions(product).sort((a, b) => a.unitPrice - b.unitPrice) : [];
    const status = resolveLandingCheckoutStatus({ hasProduct: Boolean(product), hasOrderablePacks: packs.length > 0, productIsPending: productQuery.isPending, productIsError: productQuery.isError, inventoryIsError: inventoryQuery.isError, inventoryIsFetched: inventoryQuery.isFetched, hasInventory: Boolean(inventoryQuery.data?.inventory) });
    const refresh = async () => {
      const [p, inv] = await Promise.all([productQuery.refetch(), inventoryQuery.refetch()]);
      return { product: mergeInventory(p.data, inv.data?.inventory), inventory: inv.data, isError: p.isError || inv.isError };
    };
    return { meta, product, packs, status, refresh };
  });
  const offerKey = offers.map((o) => `${o.status}:${o.packs.map((p) => `${p.variantId}=${p.unitPrice}`).join(",")}`).join("|");
  const stableOffers = useMemo(() => offers, [offerKey]);
  const shelf: GurShelfItem[] = stableOffers.filter((o) => o.status === "ready").map((o) => ({ meta: o.meta, packs: o.packs, compareAt: Number(o.product?.compare_at_price) || 0 }));
  const cheapest = Math.min(...stableOffers.flatMap((o) => o.status === "ready" ? o.packs.map((p) => p.unitPrice) : []));

  // The memo opens with ঝোলা গুড়'s first pack chosen, as in the approved design.
  const [lines, setLinesState] = useState<GurLines>({});
  const seeded = useRef(false);
  useEffect(() => {
    const first = stableOffers[0]?.packs[0];
    if (seeded.current || !first) return;
    seeded.current = true;
    setLinesState((current) => Object.keys(current).length ? current : { [first.variantId]: 1 });
  }, [stableOffers]);
  const setLines = useCallback((update: (current: GurLines) => GurLines) => setLinesState(update), []);
  const inMemo = new Set(Object.entries(lines).filter(([, q]) => q > 0).map(([id]) => id));

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1700);
  };
  const addToMemo = (slug: string, pack: LandingPackOption) => {
    setLines((current) => ({ ...current, [pack.variantId]: Math.max(1, current[pack.variantId] ?? 0) }));
    showToast(`${GUR_PRODUCTS.find((p) => p.slug === slug)?.name ?? ""} · ${pack.label} মেমোতে যোগ হয়েছে`);
  };
  const scrollToOrder = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    root.current?.querySelector("#gur-order")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => document.getElementById("gur-checkout-heading")?.focus({ preventScroll: true }), reducedMotion() ? 0 : 450);
  }, []);

  // Paint the canvas behind the page and the phone's browser bars in the hero's cream, so the
  // status bar, overscroll and safe areas match the hero. Restored when leaving the landing.
  useLayoutEffect(() => {
    const html = document.documentElement, body = document.body;
    const previous = [html.style.backgroundColor, body.style.backgroundColor];
    html.style.backgroundColor = body.style.backgroundColor = GUR_CANVAS;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta, previousTheme = meta?.content;
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.append(meta); }
    meta.content = GUR_CANVAS;
    return () => {
      [html.style.backgroundColor, body.style.backgroundColor] = previous;
      if (created) meta!.remove(); else meta!.content = previousTheme ?? "";
    };
  }, []);
  // Sections reveal once as they scroll in; the bar steps aside over the memo and the footer.
  useEffect(() => {
    const el = root.current!;
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("in"); }), { threshold: 0.2 });
    el.querySelectorAll("[data-io]").forEach((node) => reveal.observe(node));
    const bar = el.querySelector<HTMLElement>(".bar")!;
    let heroGone = false, orderIn = false, footerIn = false;
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.target.matches("[data-hero]")) heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      else if (entry.target.matches("footer")) footerIn = entry.isIntersecting;
      else orderIn = entry.isIntersecting;
      bar.classList.toggle("show", heroGone && !orderIn && !footerIn);
    }), { threshold: 0 });
    io.observe(el.querySelector("[data-hero]")!);
    io.observe(el.querySelector("#gur-order")!);
    io.observe(el.querySelector("footer")!);
    return () => { reveal.disconnect(); io.disconnect(); clearTimeout(focusTimer.current); clearTimeout(toastTimer.current); };
  }, [shelf.length]);

  return <div ref={root} className="kg gf">
    <main>
      <GurHero onOrderClick={scrollToOrder} />
      <GurQuote />
      <GurStory shelf={shelf} inMemo={inMemo} onAdd={addToMemo} />
      <div className="amsotto am-k"><section className="v1-order" id="gur-order" aria-labelledby="gur-checkout-heading">
        <GurCheckout offers={stableOffers} lines={lines} setLines={setLines} onRetry={() => void Promise.all(stableOffers.map((o) => o.refresh()))} />
      </section></div>
    </main>
    <GurFooter />
    <div className="bar" aria-hidden="true"><span className="bar-lotus" dangerouslySetInnerHTML={{ __html: PILL_LOTUS }} /><p><span>খেজুরের গুড় · ৩ রকম</span><b className="num">{Number.isFinite(cheapest) ? <>{taka(cheapest)} <small>থেকে</small></> : "ক্যাশ অন ডেলিভারি"}</b></p><a className="btn sm y" href="#gur-order" onClick={scrollToOrder} tabIndex={-1}>অর্ডার করুন</a></div>
    <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
  </div>;
}
