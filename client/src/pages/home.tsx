import Layout from "@/components/layout";
import { HeroDrip } from "@/components/hero-drip";
import PosterProductCard, { splitProductName } from "@/components/poster-product-card";
import {
  fetchStorefrontProducts,
  getProductImageSet,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import {
  getFeaturedCollection,
  getProductsForCollection,
  getTopSellingProducts,
  HOMEPAGE_AD_PRODUCT_SLUG,
  HOMEPAGE_CATEGORIES,
} from "@/lib/featured-collections";
import { BanglaNumber, toBanglaDigits } from "@/lib/bangla-digits";
import { CONTACT_DETAILS, POLICY_FACTS } from "@/lib/site-pages";

// Approved homepage redesign (2026-10-19): "Stage", direction দিক ১ · মঞ্চ. A white page of hairline cells.
// Styles live in client/src/stage.css; the shared header, menu and footer are in components/layout.tsx.

const WHATSAPP_ORDER_HREF = `${CONTACT_DETAILS.whatsappHref}?text=${encodeURIComponent("আমসত্ত্ব আচার অর্ডার করতে চাই")}`;
const FREE_DELIVERY = toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold.toLocaleString("en-IN"));
// "1–2 days" and "2–3 days" become "১–২" and "২–৩"; the fastest and slowest give the nationwide range.
const DHAKA_DAYS = toBanglaDigits(POLICY_FACTS.dhakaDeliveryDays.replace(" days", ""));
const OUTSIDE_DAYS = toBanglaDigits(POLICY_FACTS.outsideDhakaDeliveryDays.replace(" days", ""));
const DELIVERY_RANGE = `${DHAKA_DAYS.split("–")[0]}–${OUTSIDE_DAYS.split("–").pop()}`;

// Where each product sits in /home/hero-jaggery-still-life.webp (percent of the photo). Prices are never
// stored here: each dot reads its product from the live catalog and is skipped if that product is gone.
const HERO_SPOTS = [
  { slug: "round-patali-jaggery", x: 14, y: 52 },
  { slug: "granulated-jaggery", x: 30, y: 30 },
  { slug: "liquid-date-jaggery", x: 49, y: 28 },
  { slug: "chocolate-seed-jaggery", x: 68, y: 30 },
  { slug: "foil-wrapped-patali-jaggery", x: 88, y: 44 },
  { slug: "date-palm-patali", x: 77, y: 72 },
] as const;

function productsInCollection(products: StorefrontProduct[], slug: string) {
  const collection = getFeaturedCollection(slug);
  return collection ? getProductsForCollection(products, collection) : [];
}

// Cheapest orderable size, for "থেকে শুরু" prices.
function getStartingOption(product: StorefrontProduct) {
  const options = getSizeOptions(product);
  return options[0] ?? { price: Number(product.price), size: "" };
}

function getSizeOptions(product: StorefrontProduct) {
  return (product.variants ?? [])
    .filter((variant) => variant.available !== false && Number.isFinite(Number(variant.price)))
    .map((variant) => ({ price: Number(variant.price), size: String(variant.attributes?.size ?? "") }))
    .sort((a, b) => a.price - b.price);
}

function StageHero({ products }: { products: StorefrontProduct[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const spots = HERO_SPOTS.flatMap((spot) => {
    const product = products.find((item) => item.slug === spot.slug);
    return product ? [{ ...spot, product }] : [];
  });

  // A tap anywhere else closes the open price.
  useEffect(() => {
    if (!openSlug) return;
    const close = () => setOpenSlug(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openSlug]);

  return (
    <section className="st-row">
      <div className="st-hero">
        <div className="st-lab" data-load-step="">শীতের প্রথম ব্যাচ এসেছে</div>
        <h1 className="display" data-load-step="">
          খাঁটি খেজুরের <b>গুড়</b>
        </h1>
        <p className="st-hero-sub" data-load-step="">রাজশাহী থেকে সরাসরি। চিনি নেই, রং নেই।</p>
        <div className="st-hero-cta" data-load-step="">
          <Link href="/collection/jaggery" className="st-btn press">
            এখনই অর্ডার করুন <span className="arr" aria-hidden="true">→</span>
          </Link>
          <Link href="/products" className="st-lnk">সব পণ্য দেখুন</Link>
        </div>
        <div className="st-stage">
          {/* The load settle scales this wrapper, so the drip overlay stays on the photo throughout. */}
          <div className="st-photo" data-page-settle="">
            <img
              src="/home/hero-jaggery-still-life.webp"
              srcSet="/home/hero-jaggery-still-life-640.webp 640w, /home/hero-jaggery-still-life.webp 960w"
              sizes="(min-width: 1000px) 960px, 100vw"
              alt="সেরা খাবারের দানাদার, ঝোলা ও বীজ গুড়, গোল পাটালি, ফয়েল পাটালি আর খেজুরের পাটালী"
              width={960}
              height={640}
              fetchPriority="high"
              decoding="async"
            />
            <HeroDrip />
          </div>
          {spots.map(({ slug, x, y, product }, index) => {
            const { bangla } = splitProductName(product.name);
            const { price } = getStartingOption(product);
            return (
              <div
                key={slug}
                className="st-spot"
                style={{ left: `${x}%`, top: `${y}%`, "--d": `${index * 90}ms` } as CSSProperties}
                data-open={openSlug === slug || undefined}
              >
                <button
                  type="button"
                  className="st-spot-dot"
                  aria-label={`${bangla}, ৳${toBanglaDigits(price)}`}
                  aria-expanded={openSlug === slug}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenSlug(openSlug === slug ? null : slug);
                  }}
                />
                <Link href={`/product/${slug}`} className="st-pop" onClick={(event) => event.stopPropagation()}>
                  <b>{bangla}</b>
                  <span className="num">৳<BanglaNumber value={price} /></span>
                  <em>দেখুন →</em>
                </Link>
              </div>
            );
          })}
          <div className="st-ground" aria-hidden="true" />
        </div>
        {spots.length ? <p className="st-hint">বিন্দুতে চাপ দিয়ে দাম দেখুন</p> : null}
      </div>
    </section>
  );
}

function CategoryCards({ products }: { products: StorefrontProduct[] }) {
  return (
    <section>
      <div className="st-row st-head">
        <div className="st-cell">
          <h2 className="display">
            আমাদের <b>ক্যাটাগরিসমূহ</b>
          </h2>
        </div>
        <div className="st-cell">
          <span className="st-lab">যা খুঁজছেন</span>
        </div>
      </div>
      <div className="st-row st-cats">
        {HOMEPAGE_CATEGORIES.map((category, index) => {
          const count = productsInCollection(products, category.slug).length;
          return (
            <div key={category.slug} className="st-cell">
              <Link
                href={`/collection/${category.slug}`}
                className="st-cc"
                // The jaggery card is dark brown in the catalog palette; like the live cards, it tints from sand instead.
                style={{ "--c": category.light ? "#C8935E" : category.color } as CSSProperties}
                data-reveal=""
              >
                <span className="st-cc-card" />
                <img src={category.image} alt="" loading="lazy" decoding="async" />
                <span className="st-cc-meta">
                  <span className="st-cc-n num">{toBanglaDigits(String(index + 1).padStart(2, "0"))}</span>
                  <b>{category.name}</b>
                  <span className="st-cc-en">
                    {category.en} · {count ? `${toBanglaDigits(count)}টি পণ্য` : "শীঘ্রই"}
                  </span>
                </span>
                <span className="st-cc-go" aria-hidden="true">→</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PromiseRibbon() {
  const items = [
    "১০০% খাঁটি খেজুরের রস",
    "০ গ্রাম চিনি বা রং",
    `${DELIVERY_RANGE} দিনে ডেলিভারি, সারা দেশে`,
    `৳০ ডেলিভারি চার্জ, ৳${FREE_DELIVERY}+ অর্ডারে`,
  ];
  // Doubled so one set always spans the screen; the second copy makes the loop seamless.
  const set = [...items, ...items];
  return (
    <section className="st-mq" aria-label="আমাদের প্রতিশ্রুতি">
      <div className="st-mq-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="st-mq-set" aria-hidden={copy === 1 || undefined}>
            {set.map((item, index) => (
              <span key={`${item}-${index}`} style={{ display: "contents" }}>
                <span>{item}</span>
                <img src="/home/leaf-mark.webp" alt="" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductsSection({ products, failed }: { products: StorefrontProduct[]; failed: boolean }) {
  const tabs = [
    { slug: "", label: "সব", products: getTopSellingProducts(products) },
    ...HOMEPAGE_CATEGORIES.map((category) => ({
      slug: category.slug,
      label: category.name,
      products: productsInCollection(products, category.slug),
    })).filter((tab) => tab.products.length > 0),
  ];
  const [activeSlug, setActiveSlug] = useState("");
  const active = tabs.find((tab) => tab.slug === activeSlug) ?? tabs[0];
  const tabsRef = useRef<HTMLDivElement>(null);

  // The dark highlight is a clipped copy of the tab row, so text and fill change as one surface.
  useLayoutEffect(() => {
    const root = tabsRef.current;
    if (!root) return;
    const place = () => {
      const button = root.querySelector<HTMLButtonElement>(`[data-tab="${active.slug || "all"}"]`);
      if (!button) return;
      root.style.setProperty("--l", `${button.offsetLeft}px`);
      root.style.setProperty("--r", `${root.offsetWidth - button.offsetLeft - button.offsetWidth}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active.slug, tabs.length]);

  const tabButtons = (interactive: boolean) =>
    tabs.map((tab) => (
      <button
        key={tab.slug || "all"}
        type="button"
        data-tab={tab.slug || "all"}
        role={interactive ? "tab" : undefined}
        aria-selected={interactive ? tab === active : undefined}
        tabIndex={interactive ? undefined : -1}
        className={interactive ? "press" : undefined}
        onClick={interactive ? () => setActiveSlug(tab.slug) : undefined}
      >
        {tab.label}
      </button>
    ));

  return (
    <section>
      <div className="st-row st-shop-head">
        <div className="st-cell">
          <h2 className="display">
            সেরা <b>বিক্রি</b>
          </h2>
        </div>
        <div className="st-cell st-mid">
          {tabs.length > 2 ? (
            <div className="st-tabs" ref={tabsRef}>
              <div className="st-tabs-list" role="tablist" aria-label="ক্যাটাগরি">
                {tabButtons(true)}
              </div>
              <div className="st-tabs-over" aria-hidden="true">
                <div className="st-tabs-list">{tabButtons(false)}</div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="st-cell st-end">
          <Link href="/products" className="st-lnk">সব পণ্য →</Link>
        </div>
      </div>
      <div className="st-row st-grid" key={active.slug || "all"}>
        {failed ? (
          <p className="st-empty">এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।</p>
        ) : active.products.length ? (
          active.products.map((product) => (
            <PosterProductCard key={product.id || product.slug} product={product} look="stage" />
          ))
        ) : (
          <p className="st-empty">নতুন পণ্য শীঘ্রই আসছে।</p>
        )}
      </div>
    </section>
  );
}

// The founder's reel (approved 2026-10-19, "রিল"): a 9:16 clip from the date-palm garden, stored in the Cloudflare
// R2 bucket sera-khabar-media and served at /media/ (vercel.json). It plays muted, looping and inline with no tap,
// only while on screen; the speaker button turns the sound on. Reduced-motion visitors get the poster and a play
// button instead of autoplay. Rename the file (…-v2.mp4) when the clip changes, so no cache serves the old one.
const FOUNDER_REEL = { src: "/media/story/founder-reel-v1.mp4", poster: "/media/story/founder-reel-v1.jpg" };

function FounderReel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (shouldReduceMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play()?.catch(() => setPaused(true));
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [shouldReduceMotion]);

  // The progress bar follows the clip's own clock, and only animates while it plays.
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video?.duration && barRef.current) barRef.current.style.transform = `scaleX(${video.currentTime / video.duration})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  return (
    <div className="st-reel" data-reveal="">
      <video
        ref={videoRef}
        src={FOUNDER_REEL.src}
        poster={FOUNDER_REEL.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="সেরা খাবারের প্রতিষ্ঠাতা রাজশাহীর খেজুর বাগানে গুড় তৈরির গল্প বলছেন"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      <div className="st-reel-top">
        <div className="st-reel-prog" aria-hidden="true">
          <i ref={barRef} />
        </div>
        <div className="st-reel-who">
          <img src="/home/leaf-mark.webp" alt="" />
          <b>সেরা খাবার</b>
          <span>· প্রতিষ্ঠাতার কথা</span>
        </div>
      </div>
      <p className="st-reel-foot">রাজশাহীর খেজুর বাগান থেকে, গুড় তৈরির গল্প</p>
      {paused && shouldReduceMotion ? (
        <button type="button" className="st-reel-play press" aria-label="ভিডিও চালু করুন" onClick={() => videoRef.current?.play()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
        </button>
      ) : null}
      <button
        type="button"
        className="st-reel-snd press"
        aria-pressed={!muted}
        aria-label={muted ? "শব্দ চালু করুন" : "শব্দ বন্ধ করুন"}
        onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          video.muted = !video.muted;
          setMuted(video.muted);
          if (video.paused) video.play()?.catch(() => {});
        }}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
        )}
      </button>
    </div>
  );
}

function JaggeryStory() {
  const steps = [
    ["১", "ভোরে রস সংগ্রহ", "রাতভর জমা হওয়া টাটকা রস, সূর্য ওঠার আগেই।"],
    ["২", "ধীরে জ্বাল", "বড় কড়াইয়ে ঘণ্টার পর ঘণ্টা, কোনো চিনি বা রং ছাড়া।"],
    ["৩", "আপনার দরজায়", `ঢাকায় ${DHAKA_DAYS} দিন, সারা দেশে ${OUTSIDE_DAYS} দিনে।`],
  ];
  return (
    <section className="st-row st-story">
      <div className="st-cell st-story-copy">
        <div className="st-lab" data-reveal="">আমাদের গল্প</div>
        <h2 className="display" data-reveal="">
          রস থেকে <b>পাটালী</b>
        </h2>
        <p data-reveal="">
          শীতের ভোরে রাজশাহীর গাছিরা খেজুরের রস নামান। সেদিনই সেই রস জ্বাল দিয়ে আমরা গুড় আর পাটালী বানাই, যেভাবে
          আমাদের দাদি-নানিরা বানাতেন।
        </p>
        <ul className="st-story-list">
          {steps.map(([n, title, text]) => (
            <li key={n} data-reveal="">
              <span className="num">{n}</span>
              <span>
                <b>{title}</b> — <span className="st-soft">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="st-cell st-story-art">
        <FounderReel />
      </div>
    </section>
  );
}

// The আমসত্ত্ব আচার ad, priced from the catalog; if the product is not published, the button takes the
// order on WhatsApp.
function AcharAd({ product }: { product?: StorefrontProduct }) {
  const options = product ? getSizeOptions(product) : [];
  const startingPrice = options[0]?.price;

  return (
    <section className="st-row st-ad">
      <div className="st-cell st-ad-copy">
        <span className="st-ad-tag" data-reveal="">টক-ঝাল-মিষ্টি</span>
        <h2 className="st-ad-title" data-reveal="">
          <span className="st-ad-pre">আমসত্ত্ব</span>
          <span className="st-ad-word">আচার</span>
        </h2>
        <p className="st-ad-lede" data-reveal="">খাঁটি আমসত্ত্বে তৈরি, মিষ্টি-টক-ঝালের দারুণ সমন্বয়।</p>
        <div className="st-ad-buy" data-reveal="">
          {product ? (
            <Link href={`/product/${product.slug}`} className="st-btn press">
              এখনই অর্ডার করুন <span className="arr" aria-hidden="true">→</span>
            </Link>
          ) : (
            <a href={WHATSAPP_ORDER_HREF} target="_blank" rel="noopener noreferrer" className="st-btn press">
              এখনই অর্ডার করুন <span className="arr" aria-hidden="true">→</span>
            </a>
          )}
          {options.length ? (
            <span className="st-ad-sizes">
              {options.map((option, index) => (
                <span key={option.size}>
                  {index ? " · " : ""}
                  {option.size} <span className="num">৳<BanglaNumber value={option.price} /></span>
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <div className="st-cell st-ad-art">
        <div className="st-ad-glow" aria-hidden="true" />
        <img src="/home/achar-ad.webp" alt="আমসত্ত্ব আচার" width={880} height={880} loading="lazy" decoding="async" data-reveal="" />
        {startingPrice != null ? (
          <span className="st-stamp" data-reveal="">
            <b className="num">৳<BanglaNumber value={startingPrice} /></b>
            <small>থেকে শুরু</small>
          </span>
        ) : null}
      </div>
    </section>
  );
}

function HomemadeFeature({ products }: { products: StorefrontProduct[] }) {
  const featured = products.slice(0, 2);
  if (!featured.length) return null;
  return (
    <section>
      <div className="st-row st-head">
        <div className="st-cell">
          <h2 className="display">
            ঘরে <b>তৈরি</b>
          </h2>
        </div>
        <div className="st-cell">
          <Link href="/collection/homemade" className="st-lnk">হোমমেড সব →</Link>
        </div>
      </div>
      <div className="st-row st-feat">
        {featured.map((product) => {
          const { bangla } = splitProductName(product.name);
          const { src, srcSet } = getProductImageSet(product);
          const { price } = getStartingOption(product);
          return (
            <div key={product.slug} className="st-cell st-fe" data-reveal="">
              <Link href={`/product/${product.slug}`} aria-label={bangla}>
                {src ? <img src={src} srcSet={srcSet} sizes={srcSet ? "(min-width: 860px) 300px, 45vw" : undefined} alt={product.name} loading="lazy" decoding="async" /> : null}
              </Link>
              <div>
                <h3 className="display">{bangla}</h3>
                {product.description ? <p>{product.description}</p> : null}
                <Link href={`/product/${product.slug}`} className="st-lnk">
                  ৳<BanglaNumber value={price} /> থেকে →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: catalogProducts = [], isError: isCatalogError } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    initialData: generatedStorefrontProducts,
    initialDataUpdatedAt: 0,
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });
  const homepageProducts = catalogProducts.map((product) => {
    const snapshotProduct = generatedStorefrontProducts.find((snapshot) => snapshot.slug === product.slug);
    return product.compare_at_price == null && snapshotProduct?.compare_at_price != null
      ? { ...product, compare_at_price: snapshotProduct.compare_at_price }
      : product;
  });

  return (
    <Layout>
      <div className="st">
        <div className="st-frame">
          {/* Hero Section */}
          <StageHero products={homepageProducts} />

          {/* Categories Section */}
          <CategoryCards products={homepageProducts} />

          {/* Promise Ribbon */}
          <PromiseRibbon />

          {/* Products Section */}
          <ProductsSection products={homepageProducts} failed={isCatalogError && catalogProducts.length === 0} />

          {/* Story Section */}
          <JaggeryStory />

          {/* Achar Ad */}
          <AcharAd product={homepageProducts.find((product) => product.slug === HOMEPAGE_AD_PRODUCT_SLUG)} />

          {/* Homemade Section */}
          <HomemadeFeature products={productsInCollection(homepageProducts, "homemade")} />
        </div>
      </div>
    </Layout>
  );
}
