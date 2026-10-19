import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PosterProductCard from "@/components/poster-product-card";
import StageTabs from "@/components/stage-tabs";
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
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
} from "@/lib/storefront-products";
import { inventoryEntryFor, useCatalogInventory } from "@/lib/use-catalog-inventory";

// Collection pages use the homepage "Stage" look (client/src/stage.css): the same hairline grid and
// product cells and, for categories with a homepage shelf, the same sliding tabs.
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

  const filteredProducts = collection.slug === "top-selling-products"
    ? getTopSellingProducts(products ?? [])
    : getProductsForCollection(products ?? [], collection);
  const [englishName = "", bengaliName = ""] = collection.label.split("-").map((part) => part.trim());
  const shelf = HOMEPAGE_SHELVES.find((item) => item.slug === collection.slug);
  const groups = shelf ? groupProductsByTabs(filteredProducts, shelf.tabs) : [];
  const tabs = groups.length > 1 ? [{ label: "সব", products: filteredProducts }, ...groups] : [];
  const active = tabs.find((tab) => tab.label === activeTab) ?? tabs[0];
  const visibleProducts = active?.products ?? filteredProducts;

  return (
    <Layout>
      <div className="st">
        <div className="st-frame">
          <div className="st-row st-head">
            <div className="st-cell">
              <h1 className="display" data-load-step="">
                <b>{bengaliName || englishName}</b>
              </h1>
            </div>
            <div className="st-cell">
              {bengaliName && englishName ? <span className="st-lab">{englishName}</span> : null}
            </div>
          </div>

          {tabs.length ? (
            <div className="st-row st-tabs-row">
              <div className="st-cell">
                <StageTabs
                  tabs={tabs.map((tab) => ({ key: tab.label, label: tab.label }))}
                  activeKey={active?.label ?? ""}
                  onSelect={setActiveTab}
                  label={bengaliName || englishName}
                />
              </div>
            </div>
          ) : null}

          <div key={active?.label ?? "all"} className="st-row st-grid">
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
                {isError ? "এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।" : "নতুন পণ্য শীঘ্রই আসছে।"}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
