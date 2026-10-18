import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PosterProductCard from "@/components/poster-product-card";
import RecentlyViewed from "@/components/recently-viewed";
import SkewReveal from "@/components/skew-reveal";
import { useLocation } from "wouter";
import {
  fetchStorefrontProducts,
  searchStorefrontProducts,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { getFeaturedCollection, getProductsForCollection, HOMEPAGE_CATEGORIES } from "@/lib/featured-collections";
import { toBanglaDigits } from "@/lib/bangla-digits";
import { inventoryEntryFor, useCatalogInventory } from "@/lib/use-catalog-inventory";

// The all-products page uses the homepage "Market Poster" look (client/src/poster.css), with the
// same category chips as the homepage's "আমাদের পণ্য" section.
export default function ProductsPage() {
  const [location] = useLocation();
  const searchQuery = new URLSearchParams(location.split("?")[1] ?? "").get("search") ?? "";
  const { data: products, isError } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    initialData: generatedStorefrontProducts,
    initialDataUpdatedAt: 0,
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });
  const filteredProducts: StorefrontProduct[] = products ? searchStorefrontProducts(products, searchQuery) : [];
  const inventory = useCatalogInventory(products ?? []);
  const [activeSlug, setActiveSlug] = useState("");

  // Category chips only make sense for the whole catalog, not for search results.
  const chips = searchQuery
    ? []
    : [
        { slug: "", label: "সব", products: filteredProducts },
        ...HOMEPAGE_CATEGORIES.map((category) => {
          const collection = getFeaturedCollection(category.slug);
          return {
            slug: category.slug,
            label: category.name,
            products: collection ? getProductsForCollection(filteredProducts, collection) : [],
          };
        }).filter((chip) => chip.products.length > 0),
      ];
  const active = chips.length > 2 ? chips.find((chip) => chip.slug === activeSlug) ?? chips[0] : undefined;
  const visibleProducts = active?.products ?? filteredProducts;

  return (
    <Layout>
      <div className="sk">
        <section className="cx-sec col-head">
          <div className="wrap">
            <SkewReveal as="h1">সকল পণ্য</SkewReveal>
            <SkewReveal className="script sub">All Products</SkewReveal>
            {searchQuery ? (
              <p className="col-note">
                “{searchQuery}” খুঁজে <span className="num">{toBanglaDigits(filteredProducts.length)}</span>টি পণ্য পাওয়া গেছে
              </p>
            ) : null}
          </div>
        </section>

        <section className="c-sec col-sec">
          <div className="wrap">
            {active ? (
              <div className="c-tabs col-tabs" role="tablist" aria-label="ক্যাটাগরি">
                {chips.map((chip) => (
                  <button
                    key={chip.slug || "all"}
                    type="button"
                    role="tab"
                    aria-selected={chip === active}
                    className={`chip press${chip === active ? " on" : ""}`}
                    onClick={() => setActiveSlug(chip.slug)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <div key={active?.slug || "all"} className="c-list">
                {visibleProducts.map((product) => (
                  <PosterProductCard
                    key={product.id || product.slug}
                    product={product}
                    inventory={inventoryEntryFor(inventory, product)}
                  />
                ))}
              </div>
            ) : (
              <div className="c-list">
                <p className="c-empty">
                  {isError
                    ? "এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।"
                    : searchQuery
                      ? `“${searchQuery}” নামে কোনো পণ্য পাওয়া যায়নি।`
                      : "নতুন পণ্য শীঘ্রই আসছে।"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <RecentlyViewed products={products ?? generatedStorefrontProducts} />
    </Layout>
  );
}
