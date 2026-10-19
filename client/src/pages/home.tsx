import Layout from "@/components/layout";
import PosterProductCard, { splitProductName } from "@/components/poster-product-card";
import StageTabs from "@/components/stage-tabs";
import {
  fetchStorefrontProducts,
  getProductImageSet,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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

// The day hero (approved 2026-10-19, "দিন"): dawn sap to noon patali in four panels. The dawn clip lives in the
// Cloudflare R2 bucket sera-khabar-media and loads straight from R2 (a Vercel rewrite once cached a partial range
// and broke the founder reel). Product panels read their name, photo and price from the live catalog and drop out
// if that product is gone; only the time-of-day story is written here. Rename the clip (…-v2.mp4) when it changes.
const DAY_MEDIA_ORIGIN = "https://pub-cfecc6eab1f44552a42789747b613cb7.r2.dev";
const DAY_DAWN = { src: `${DAY_MEDIA_ORIGIN}/hero/dawn-v2.mp4`, poster: `${DAY_MEDIA_ORIGIN}/hero/dawn-v2.jpg` };
type DayStep = { time: string; title: string; note: string; slug?: string };
const DAY_STEPS: DayStep[] = [
  { time: "ভোর ৪টা", title: "রস নামানো", note: "শীতের কুয়াশায়, রাতভর জমা টাটকা রস নামানো হয় সূর্য ওঠার আগেই।" },
  { time: "সকাল ৮টা", title: "ঝোলা গুড়", slug: "liquid-date-jaggery", note: "রুটি, মুড়ি আর পায়েসে এক চামচ।" },
  { time: "সকাল ১০টা", title: "বীজ গুড়", slug: "chocolate-seed-jaggery", note: "দানা দানা, চকলেটের মতো ঘন।" },
  { time: "দুপুর ১২টা", title: "পাটালি", slug: "date-palm-patali", note: "জমে শক্ত, ভাঙলে মুচমুচে।" },
];
const DAY_DURATION_MS = { dawn: 6000, product: 4500 };

function DayHero({ products }: { products: StorefrontProduct[] }) {
  const steps = DAY_STEPS.flatMap((step): (DayStep & { product: StorefrontProduct | null })[] => {
    if (!step.slug) return [{ ...step, product: null }];
    const product = products.find((item) => item.slug === step.slug);
    return product ? [{ ...step, product }] : [];
  });
  // `prev` is the moment just left, so phones can slide it out as the next one slides in.
  const [{ active, prev }, setStep] = useState({ active: 0, prev: -1 });
  const setActive = (index: number) => setStep((step) => (step.active === index ? step : { active: index, prev: step.active }));
  const [held, setHeld] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const duration = steps[active]?.product ? DAY_DURATION_MS.product : DAY_DURATION_MS.dawn;

  // The active story bar is the clock: it fills over the moment's duration and its end steps the hero on, so the
  // bar and the change always agree. Resting the pointer on a panel pauses it; reduced motion has no bar to run.
  const next = () => setActive((active + 1) % steps.length);

  // The dawn clip plays muted and inline, only while its panel shows.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    if (active === 0 && !shouldReduceMotion) video.play()?.catch(() => {});
    else video.pause();
  }, [active, shouldReduceMotion]);

  // Only the open panel shows its bars; they mount with it, so the running bar always starts empty.
  const bars = (
    <span className="st-day-bars" aria-hidden="true" style={{ "--dur": `${duration}ms` } as CSSProperties}>
      {steps.map((step, bar) => (
        <i
          key={bar === active ? `${step.time}-run` : step.time}
          data-done={bar < active || undefined}
          data-run={(bar === active && !shouldReduceMotion && steps.length > 1) || undefined}
          onAnimationEnd={bar === active ? next : undefined}
        />
      ))}
    </span>
  );
  const last = Math.max(steps.length - 1, 1);

  return (
    <section className="st-row">
      <div>
        <div className="st-day-top">
          <div>
            <h1 className="display" data-load-step="">
              খেজুরের
              <br />
              খাঁটি <b>গুড়</b>
            </h1>
            <p className="st-day-sub" data-load-step="">শীতের ভোরের রস, মাটির চুলায় জ্বাল।</p>
          </div>
          <Link href="/collection/jaggery" className="st-btn press" data-load-step="">
            অর্ডার করুন <span className="arr" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="st-day-line">
          {/* Fills smoothly from this moment's dot to the next one's, in step with the story bar. */}
          <span
            key={active}
            className="st-day-fill"
            data-run={(!shouldReduceMotion && active < last) || undefined}
            style={
              {
                "--from": active / last,
                "--to": Math.min(active + 1, last) / last,
                "--dur": `${duration}ms`,
                transform: `scaleX(${active / last})`,
              } as CSSProperties
            }
          />
          {steps.map((step, index) => (
            <button
              key={step.time}
              type="button"
              style={{ left: `${(index / last) * 100}%` }}
              data-on={index === active || undefined}
              data-past={index < active || undefined}
              aria-label={`${step.time}, ${step.title}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <span className="st-day-dot" />
              <span className="st-day-lb">
                <small>{step.time}</small>
                {step.title}
              </span>
            </button>
          ))}
        </div>

        <div
          className="st-day-panels"
          data-page-settle=""
          data-held={held || undefined}
          data-reduced={shouldReduceMotion || undefined}
          onPointerLeave={() => setHeld(false)}
        >
          {steps.map((step, index) => {
            const on = index === active;
            const select = (event: { pointerType?: string }) => {
              if (event.pointerType && event.pointerType !== "mouse") return;
              setHeld(true);
              setActive(index);
            };
            if (!step.product) {
              return (
                <button
                  key={step.time}
                  type="button"
                  className="st-day-pn is-film"
                  data-on={on || undefined}
                  data-prev={index === prev || undefined}
                  aria-label={`${step.time}, ${step.title}`}
                  onPointerEnter={select}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                >
                  {on ? bars : null}
                  <video
                    ref={videoRef}
                    src={DAY_DAWN.src}
                    poster={DAY_DAWN.poster}
                    muted
                    autoPlay={!shouldReduceMotion}
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                  />
                  <span className="st-day-cap">
                    <span className="st-day-t">{step.time}</span>
                    <span className="st-day-n">{step.title}</span>
                    <span className="st-day-more">
                      <span>
                        <p>{step.note}</p>
                      </span>
                    </span>
                  </span>
                </button>
              );
            }
            const { bangla } = splitProductName(step.product.name);
            const { price } = getStartingOption(step.product);
            const image = getProductImageSet(step.product);
            return (
              <Link
                key={step.time}
                href={`/product/${step.product.slug}`}
                className="st-day-pn"
                data-on={on || undefined}
                data-prev={index === prev || undefined}
                aria-label={`${step.time}, ${bangla}, ৳${toBanglaDigits(price)}`}
                onPointerEnter={select}
                onFocus={() => setActive(index)}
                onClick={(event) => {
                  // A closed panel opens on the first tap; the open one goes to the product.
                  if (!on) {
                    event.preventDefault();
                    setActive(index);
                  }
                }}
              >
                {on ? bars : null}
                {image.src ? (
                  <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="(min-width: 760px) 40vw, 100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="st-day-cap">
                  <span className="st-day-t">{step.time}</span>
                  <span className="st-day-n">{step.title}</span>
                  <span className="st-day-more">
                    <span>
                      <p>{step.note}</p>
                      <span className="num">
                        ৳<BanglaNumber value={price} />
                      </span>
                      <em>{bangla} দেখুন →</em>
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
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
            <StageTabs
              tabs={tabs.map((tab) => ({ key: tab.slug, label: tab.label }))}
              activeKey={active.slug}
              onSelect={setActiveSlug}
              label="ক্যাটাগরি"
            />
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
// R2 bucket sera-khabar-media and loaded straight from R2, which answers the browser's byte-range requests. (A
// Vercel rewrite cached one partial range and served it for every request, so the video never loaded.) It plays
// muted, looping and inline with no tap, only while on screen; the speaker button turns the sound on. Reduced-motion
// visitors, and browsers that refuse autoplay, get the poster and a play button. Rename the file (…-v2.mp4) when the
// clip changes, so no cache serves the old one.
const FOUNDER_REEL_ORIGIN = "https://pub-cfecc6eab1f44552a42789747b613cb7.r2.dev";
const FOUNDER_REEL = {
  src: `${FOUNDER_REEL_ORIGIN}/story/founder-reel-v1.mp4`,
  poster: `${FOUNDER_REEL_ORIGIN}/story/founder-reel-v1.jpg`,
};

function FounderReel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // iOS Safari only autoplays a video whose muted state is set before it plays.
    video.defaultMuted = true;
    video.muted = true;
    if (shouldReduceMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play()?.catch(() => setBlocked(true));
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
        autoPlay={!shouldReduceMotion}
        loop
        playsInline
        preload="auto"
        aria-label="সেরা খাবারের প্রতিষ্ঠাতা রাজশাহীর খেজুর বাগানে গুড় তৈরির গল্প বলছেন"
        onPlay={() => {
          setPaused(false);
          setBlocked(false);
        }}
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
      {paused && (shouldReduceMotion || blocked) ? (
        <button type="button" className="st-reel-play press" aria-label="ভিডিও চালু করুন" onClick={() => videoRef.current?.play()?.catch(() => {})}>
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
          <DayHero products={homepageProducts} />

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
