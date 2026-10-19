import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import PosterProductCard from "@/components/poster-product-card";
import {
  getRecentlyViewedProducts,
  useRecentlyViewedSlugs,
} from "@/lib/recently-viewed";
import type { StorefrontProduct } from "@/lib/storefront-products";

type RecentlyViewedProps = {
  products: StorefrontProduct[];
  excludeSlug?: string;
  className?: string;
  // "stage": the 2026-10-19 Stage row (stage.css) used under the product page.
  look?: "poster" | "stage";
};

// Homepage-style section: big Noto heading with a pink Galada line, round turmeric arrows,
// and the homepage poster cards in a snapping row.
export default function RecentlyViewed({ products, excludeSlug, className = "", look = "poster" }: RecentlyViewedProps) {
  const slugs = useRecentlyViewedSlugs();
  const recentProducts = getRecentlyViewedProducts(products, slugs, excludeSlug);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    setCanScrollLeft(carousel.scrollLeft > 1);
    setCanScrollRight(carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      carousel.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [recentProducts.length, updateScrollState]);

  if (recentProducts.length === 0) return null;

  const scrollByPage = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.scrollBy({ left: direction * carousel.clientWidth, behavior: "smooth" });
  };

  const nav = (
    <>
      <button
        type="button"
        aria-label="Previous recently viewed products"
        aria-controls="recently-viewed-products"
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollLeft}
        className="press"
      >
        <ChevronLeft aria-hidden="true" size={look === "stage" ? 18 : 20} strokeWidth={look === "stage" ? 1.4 : 2} />
      </button>
      <button
        type="button"
        aria-label="Next recently viewed products"
        aria-controls="recently-viewed-products"
        onClick={() => scrollByPage(1)}
        disabled={!canScrollRight}
        className="press"
      >
        <ChevronRight aria-hidden="true" size={look === "stage" ? 18 : 20} strokeWidth={look === "stage" ? 1.4 : 2} />
      </button>
    </>
  );

  if (look === "stage") {
    return (
      <section className={`st ${className}`}>
        <div className="st-frame">
          <div className="st-row st-head">
            <div className="st-cell">
              <h2 className="display">
                সম্প্রতি <b>দেখা</b>
              </h2>
            </div>
            <div className="st-cell st-rv-side">
              <span className="st-lab">আবার দেখে নিন</span>
              <div className="st-rv-nav">{nav}</div>
            </div>
          </div>
          <div ref={carouselRef} id="recently-viewed-products" className="st-rail">
            {recentProducts.map((product) => (
              <PosterProductCard key={product.slug} product={product} look="stage" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`sk rv ${className}`}>
      <div className="wrap">
        <div className="rv-head">
          <div>
            <h2>সম্প্রতি দেখা</h2>
            <span className="script">আবার দেখে নিন</span>
          </div>
          <div className="rv-nav">
            {nav}
          </div>
        </div>

        <div ref={carouselRef} id="recently-viewed-products" className="rv-rail">
          {recentProducts.map((product) => (
            <PosterProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
