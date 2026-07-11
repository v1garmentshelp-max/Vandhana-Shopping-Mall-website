import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { MdOutlineSearchOff } from "react-icons/md";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";
import { fetchProductsByGender } from "../services/productsApi";

const normalizeCategoryText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCategoryFromSearch = (search: string) => {
  const params = new URLSearchParams(search);
  return normalizeCategoryText(params.get("category") || "");
};

const getProductName = (product: any) =>
  normalizeCategoryText(product?.title || product?.name || product?.product_name || product?.productName || "");

const getProductGender = (product: any) =>
  normalizeCategoryText(product?.gender || product?.category || "");

const getProductCardKey = (product: any, index: number) => {
  return [
    product?.variantId,
    product?.variant_id,
    product?.primaryVariantId,
    product?.primary_variant_id,
    product?.barcode,
    product?.ean_code,
    product?.id,
    product?.productId,
    product?.product_id,
    product?.color,
    product?.colour,
    index,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("-");
};

const getRootGenderForCategory = (category: any) => {
  if (!category) return "";
  if (category.level === 0) return category.name || "";
  const parent = categories.find((item: any) => item.id === category.parentId);
  if (!parent) return "";
  if (parent.level === 0) return parent.name || "";
  const root = categories.find((item: any) => item.id === parent.parentId);
  return root?.name || "";
};

const getGenderForCategory = (categoryName: string) => {
  const normalized = normalizeCategoryText(categoryName);
  if (!normalized) return "";

  if (normalized === "men" || normalized.startsWith("men ")) return "Men";
  if (normalized === "women" || normalized.startsWith("women ")) return "Women";
  if (normalized === "kids" || normalized.startsWith("kids ")) return "Kids";

  const storedGender = localStorage.getItem("preferred_gender");
  if (storedGender) return storedGender;

  const matchedCategory = categories.find(
    (category: any) =>
      category.level === 2 &&
      (normalizeCategoryText(category.name) === normalized ||
        normalizeCategoryText(category.slug) === normalized),
  );

  return getRootGenderForCategory(matchedCategory);
};

const getLevel2CategoriesForGender = (gender: string) => {
  const root = categories.find(
    (category: any) =>
      category.level === 0 &&
      normalizeCategoryText(category.name) === normalizeCategoryText(gender),
  );

  if (!root) return [];

  const level1Ids = categories
    .filter((category: any) => category.level === 1 && category.parentId === root.id)
    .map((category: any) => category.id);

  return categories.filter(
    (category: any) =>
      category.level === 2 && level1Ids.includes(String(category.parentId || "")),
  );
};

const getMatchedCategoryName = (query: string, gender: string, tabs: string[]) => {
  const normalizedQuery = normalizeCategoryText(query);
  if (!normalizedQuery) return "";

  const genderCategories = getLevel2CategoriesForGender(gender);

  const matchedCategory = genderCategories.find((category: any) => {
    const name = normalizeCategoryText(category.name);
    const slug = normalizeCategoryText(category.slug);
    const genderName = normalizeCategoryText(`${gender} ${category.name}`);
    return name === normalizedQuery || slug === normalizedQuery || genderName === normalizedQuery;
  });

  if (matchedCategory) return matchedCategory.name;

  const matchedTab = tabs.find((tabName) => {
    const tab = normalizeCategoryText(tabName);
    const genderTab = normalizeCategoryText(`${gender} ${tabName}`);
    return tab === normalizedQuery || genderTab === normalizedQuery;
  });

  return matchedTab || "";
};

const productMatchesCategory = (product: Product, categoryName: string) => {
  const title = getProductName(product);
  const category = normalizeCategoryText(categoryName);

  if (!title || !category || category === "all") return true;

  if (category.includes("polo")) {
    return title.includes("polo");
  }

  if (category.includes("cargo")) {
    return title.includes("cargo") || title.includes("cargo pant");
  }

  if (category.includes("kurti")) {
    return title.includes("kurti") || title.includes("kurti pant set");
  }

  if (category.includes("night dress")) {
    return title.includes("night dress");
  }

  if (category.includes("beggi") || category.includes("baggy") || category.includes("bagge")) {
    return title.includes("beggi") || title.includes("baggy") || title.includes("bagge");
  }

  if (category.includes("jean")) {
    return title.includes("jean") || title.includes("denim");
  }

  if (category.includes("top")) {
    return title.includes("top") || title.includes("women h s top") || title.includes("h s top");
  }

  if (category.includes("t shirt") || category.includes("tshirt") || category.includes("tee")) {
    return title.includes("t shirt") || title.includes("tshirt") || title.includes("t-shirt") || title.includes("oversized");
  }

  if (category.includes("pant")) {
    if (title.includes("kurti pant set")) return false;
    return title.includes("pant") || title.includes("cargo") || title.includes("bagge") || title.includes("beggi");
  }

  if (category.includes("shirt")) {
    return title.includes("shirt") && !title.includes("t shirt") && !title.includes("tshirt");
  }

  if (category.includes("dress")) {
    return title.includes("dress");
  }

  if (category.includes("jogger")) {
    return title.includes("jogger");
  }

  if (category.includes("short")) {
    return title.includes("short");
  }

  if (category.includes("pyjama") || category.includes("pajama")) {
    return title.includes("pyjama") || title.includes("pajama");
  }

  if (category.includes("vest")) {
    return title.includes("vest");
  }

  if (category.includes("hoodie")) {
    return title.includes("hoodie");
  }

  if (category.includes("sweatshirt")) {
    return title.includes("sweatshirt");
  }

  return title.includes(category);
};

const getProductsForTab = (products: Product[], activeTab: string) => {
  if (activeTab === "ALL") return products;

  const matched = products.filter((product) => productMatchesCategory(product, activeTab));

  if (matched.length) return matched;

  return [];
};

const CollectionTabsContent = ({ title }: { title?: string }) => {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(loadingMore);
  const [, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const location = useLocation();

  useEffect(() => {
    loadingRef.current = loadingMore;
  }, [loadingMore]);

  const categoryFromQuery = useMemo(() => getCategoryFromSearch(location.search), [location.search]);
  const genderFromCategory = useMemo(() => getGenderForCategory(categoryFromQuery), [categoryFromQuery]);

  const preferredGender = useMemo(() => {
    return genderFromCategory || localStorage.getItem("preferred_gender") || "Men";
  }, [location.pathname, genderFromCategory]);

  useEffect(() => {
    if (genderFromCategory) {
      localStorage.setItem("preferred_gender", genderFromCategory);
      localStorage.setItem("preferred_gender_url", `/${genderFromCategory.toLowerCase()}`);
    }
  }, [genderFromCategory]);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      setError("");

      try {
        const data = await fetchProductsByGender(preferredGender as any, 3);
        if (alive) setProducts(data);
      } catch (err: any) {
        if (alive) {
          setProducts([]);
          setError(err?.message || "Unable to load products");
        }
      } finally {
        if (alive) setProductsLoading(false);
      }
    };

    void loadProducts();

    return () => {
      alive = false;
    };
  }, [preferredGender]);

  const tabs = useMemo(() => {
    const level2Cats = getLevel2CategoriesForGender(preferredGender);
    const uniqueNames = Array.from(new Set(level2Cats.map((category: any) => category.name).filter(Boolean)));
    return ["ALL", ...uniqueNames];
  }, [preferredGender]);

  useEffect(() => {
    if (categoryFromQuery) {
      const matchedTab = getMatchedCategoryName(categoryFromQuery, preferredGender, tabs);

      if (matchedTab) {
        setActiveTab(matchedTab);
        return;
      }
    }

    if (!tabs.includes(activeTab)) {
      setActiveTab("ALL");
    }
  }, [tabs, activeTab, categoryFromQuery, preferredGender]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY.current);

      if (scrollDifference < 5) return;

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setVisibleCount(12);
    setLoadingMore(false);
  }, [activeTab, products]);

  const currentProducts = useMemo(() => {
    const genderProducts = products.filter(
      (product) => getProductGender(product) === normalizeCategoryText(preferredGender),
    );

    if (activeTab !== "ALL") {
      return getProductsForTab(genderProducts, activeTab);
    }

    let recentlyViewedIds: string[] = [];

    try {
      recentlyViewedIds = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    } catch {
      recentlyViewedIds = [];
    }

    const recentlyViewed = genderProducts.filter((product: any) =>
      recentlyViewedIds.includes(String(product.id)) ||
      recentlyViewedIds.includes(String(product.variantId)) ||
      recentlyViewedIds.includes(String(product.variant_id)) ||
      recentlyViewedIds.includes(String(product.productId)) ||
      recentlyViewedIds.includes(String(product.product_id)),
    );

    recentlyViewed.sort(
      (a: any, b: any) =>
        recentlyViewedIds.indexOf(String(a.id)) -
        recentlyViewedIds.indexOf(String(b.id)),
    );

    const recentlyViewedKeys = new Set(
      recentlyViewed.flatMap((product: any) => [
        String(product.id || ""),
        String(product.variantId || ""),
        String(product.variant_id || ""),
        String(product.productId || ""),
        String(product.product_id || ""),
      ]),
    );

    const remaining = genderProducts.filter((product: any) => {
      const keys = [
        String(product.id || ""),
        String(product.variantId || ""),
        String(product.variant_id || ""),
        String(product.productId || ""),
        String(product.product_id || ""),
      ];

      return !keys.some((key) => recentlyViewedKeys.has(key));
    });

    return [...recentlyViewed, ...remaining];
  }, [activeTab, preferredGender, products]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          if (visibleCount < currentProducts.length) {
            setLoadingMore(true);
            timeoutId = setTimeout(() => {
              setVisibleCount((prev) => prev + 12);
              setLoadingMore(false);
            }, 400);
          }
        }
      },
      { threshold: 0.1, rootMargin: "400px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [visibleCount, currentProducts.length]);

  const displayedProducts = currentProducts.slice(0, visibleCount);
  const hasMore = visibleCount < currentProducts.length;

  return (
    <div className="w-full px-2 xl:px-6 bg-white flex flex-col font-sans py-4 pb-12 relative z-10">
      {title && (
        <h2 className="text-xl md:text-3xl font-source-sans uppercase font-bold text-left md:text-center text-gray-900 mb-4 md:mb-6 px-4 md:px-8 xl:px-12">
          {title}
        </h2>
      )}

      <div
        className={`sticky z-49 bg-white py-3 transition-all duration-500 ease-in-out top-[54px] lg:top-[71px]`}
      >
        <div
          className="flex py-1 gap-2 md:gap-4 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tabName) => {
            const isActive = tabName === activeTab;

            return (
              <button
                key={tabName}
                onClick={() => setActiveTab(tabName)}
                className={`shrink-0 whitespace-nowrap px-5 py-2 md:px-6 md:py-[6px] rounded-[15px] text-xs md:text-sm font-medium capitalize transition-all duration-300 border cursor-pointer
                  ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-900 hover:text-gray-900"
                  }
                `}
              >
                {tabName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 min-h-[50vh]">
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={`tab-loading-${idx}`} className="min-w-0">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-20 px-8 h-[calc(100vh-200px)] md:h-[calc(100vh-140px)] flex flex-col items-center justify-center font-montserrat text-center mx-auto">
            <div className="rounded-full flex items-center justify-center mb-6 text-gray-900">
              <MdOutlineSearchOff size={86} />
            </div>
            <h3 className="text-2xl md:text-4xl uppercase font-bold tracking-widest mb-6 text-[#1f2937]">
              Unable to load products
            </h3>
            <p className="text-[#6b7280] mb-8 text-sm md:text-base px-3 max-w-md mx-auto">
              {error}
            </p>
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="py-20 px-8 h-[calc(100vh-200px)] md:h-[calc(100vh-140px)] flex flex-col items-center justify-center font-montserrat text-center mx-auto">
            <div className="rounded-full flex items-center justify-center mb-6 text-gray-900">
              <MdOutlineSearchOff size={86} />
            </div>
            <h3 className="text-2xl md:text-4xl uppercase font-bold tracking-widest mb-6 text-[#1f2937]">
              No products found
            </h3>
            <p className="text-[#6b7280] mb-8 text-sm md:text-base px-3 max-w-md mx-auto">
              We couldn't find any items in this collection right now. Check back later or explore other categories.
            </p>
            <button
              onClick={() => setActiveTab("ALL")}
              className="inline-block bg-primary hover:bg-red-600 font-source-sans cursor-pointer text-white border border-gray-200 px-8 py-3 rounded-sm font-bold uppercase text-xs tracking-wider hover:text-white hover:border-gray-200/80 transition-all shadow-sm"
            >
              View All Products
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {displayedProducts.map((product: any, index) => (
                <div key={getProductCardKey(product, index)} className="min-w-0">
                  <ProductCard {...product} />
                </div>
              ))}
              {loadingMore &&
                hasMore &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`skeleton-${idx}`} className="min-w-0">
                    <ProductCardSkeleton />
                  </div>
                ))}
            </div>

            <div
              ref={observerTarget}
              className="w-full flex flex-col items-center justify-center py-2 mt-2 h-4"
            >
              {!hasMore && displayedProducts.length > 0 && (
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  You've reached the end
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const CollectionTabs = (props: any) => (
  <CollectionTabsContent {...props} />
);