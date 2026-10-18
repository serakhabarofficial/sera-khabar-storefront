import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PosterProductCard from "@/components/poster-product-card";
import SkewReveal from "@/components/skew-reveal";
import NotFound from "@/pages/not-found";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import {
  getCollection,
  getTopSellingProducts,
  getProductsForCollection,
  groupProductsByTabs,
  HOMEPAGE_SHELVES,
} from "@/lib/featured-collections";
import {
  fetchStorefrontProducts,
  mergeInventory,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
} from "@/lib/storefront-products";
import { inventoryEntryFor, useCatalogInventory } from "@/lib/use-catalog-inventory";

// Collection pages use the homepage "Market Poster" look (client/src/poster.css): the same
// product cards and, for categories with a homepage shelf, the same tabs.
export default function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = getCollection(params.slug);
  const { data: products, isError } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    initialData: generatedStorefrontProducts,
    initialDataUpdatedAt: 0,
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });
  // Keyed on the full catalog (not the filtered slice) so /products and every
  // /collection page share one inventory query instead of one per page.
  const inventory = useCatalogInventory(products ?? []);
  const [activeTab, setActiveTab] = useState("");

  if (!collection) {
    return <NotFound />;
  }

  const filteredProducts = (
    collection.slug === "top-selling-products"
      ? getTopSellingProducts(products ?? [])
      : getProductsForCollection(products ?? [], collection)
  ).map((product) => mergeInventory(product, inventoryEntryFor(inventory, product)) ?? product);
  const [englishName = "", bengaliName = ""] = collection.label.split("-").map((part) => part.trim());
  const shelf = HOMEPAGE_SHELVES.find((item) => item.slug === collection.slug);
  const groups = shelf ? groupProductsByTabs(filteredProducts, shelf.tabs) : [];
  const tabs = groups.length > 1 ? [{ label: "সব", products: filteredProducts }, ...groups] : [];
  const active = tabs.find((tab) => tab.label === activeTab) ?? tabs[0];
  const visibleProducts = active?.products ?? filteredProducts;

  return (
    <Layout>
      <div className="sk">
        <section className="cx-sec col-head">
          <div className="wrap">
            <SkewReveal as="h1">{bengaliName || englishName}</SkewReveal>
            {bengaliName && englishName ? <SkewReveal className="script sub">{englishName}</SkewReveal> : null}
          </div>
        </section>

        <section className="c-sec col-sec">
          <div className="wrap">
            {tabs.length ? (
              <div className="c-tabs col-tabs" role="tablist" aria-label={bengaliName || englishName}>
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={tab === active}
                    className={`chip press${tab === active ? " on" : ""}`}
                    onClick={() => setActiveTab(tab.label)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <div key={active?.label ?? "all"} className="c-list">
                {visibleProducts.map((product) => (
                  <PosterProductCard key={product.id || product.slug} product={product} />
                ))}
              </div>
            ) : (
              <div className="c-list">
                <p className="c-empty">
                  {isError ? "এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।" : "নতুন পণ্য শীঘ্রই আসছে।"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
