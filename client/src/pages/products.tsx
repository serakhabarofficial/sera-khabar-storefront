import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PosterProductCard from "@/components/poster-product-card";
import RecentlyViewed from "@/components/recently-viewed";
import StageTabs from "@/components/stage-tabs";
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

// The all-products page uses the homepage "Stage" look (client/src/stage.css): the same hairline grid,
// product cells and sliding category tabs as the homepage's "সেরা বিক্রি" section.
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
      <div className="st">
        <div className="st-frame">
          <div className="st-row st-head">
            <div className="st-cell">
              <h1 className="display" data-load-step="">
                সকল <b>পণ্য</b>
              </h1>
            </div>
            <div className="st-cell">
              {searchQuery ? (
                <span className="st-lab">
                  “{searchQuery}” খুঁজে <span className="num">{toBanglaDigits(filteredProducts.length)}</span>টি পণ্য পাওয়া গেছে
                </span>
              ) : (
                <span className="st-lab">All Products</span>
              )}
            </div>
          </div>

          {active ? (
            <div className="st-row st-tabs-row">
              <div className="st-cell">
                <StageTabs
                  tabs={chips.map((chip) => ({ key: chip.slug, label: chip.label }))}
                  activeKey={active.slug}
                  onSelect={setActiveSlug}
                  label="ক্যাটাগরি"
                />
              </div>
            </div>
          ) : null}

          <div key={active?.slug || "all"} className="st-row st-grid">
            {visibleProducts.length > 0 ? (
              visibleProducts.map((product) => (
                <PosterProductCard
                  key={product.id || product.slug}
                  product={product}
                  inventory={inventoryEntryFor(inventory, product)}
                  look="stage"
                />
              ))
            ) : (
              <p className="st-empty">
                {isError
                  ? "এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।"
                  : searchQuery
                    ? `“${searchQuery}” নামে কোনো পণ্য পাওয়া যায়নি।`
                    : "নতুন পণ্য শীঘ্রই আসছে।"}
              </p>
            )}
          </div>
        </div>
      </div>

      <RecentlyViewed products={products ?? generatedStorefrontProducts} look="stage" />
    </Layout>
  );
}
