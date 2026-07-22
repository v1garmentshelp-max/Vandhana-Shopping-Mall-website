import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { MdOutlineSearchOff } from "react-icons/md";
import type { Product, ProductGender } from "../Models/Product";
import {
  fetchCategoriesByGender,
  fetchProductsByGender,
  type StorefrontCategory,
} from "../services/productsApi";

const normalizeCategoryText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

const getParams = (search: string) => {
  const params = new URLSearchParams(search);

  return {
    gender: params.get("gender") || "",
    categoryId:
      params.get("category_id") ||
      params.get("categoryId") ||
      "",
    categorySlug:
      params.get("category_slug") ||
      params.get("categorySlug") ||
      "",
    category: params.get("category") || "",
  };
};

const toGender = (value: any): ProductGender => {
  const gender = normalizeCategoryText(value);

  if (gender === "women") return "Women";
  if (gender === "kids" || gender === "kid") return "Kids";

  return "Men";
};

const getCategoryParentId = (category: StorefrontCategory) =>
  String(
    (category as any)?.parentId ||
      (category as any)?.parent_id ||
      "",
  ).trim();

const getCategoryPath = (category: StorefrontCategory) =>
  String(
    (category as any)?.categoryPath ||
      (category as any)?.category_path ||
      category?.name ||
      "",
  ).trim();

const getCategoryLabel = (
  category: StorefrontCategory,
  gender: ProductGender,
) => {
  const path = getCategoryPath(category);

  if (!path) return String(category?.name || "");

  const parts = path
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    parts.length &&
    normalizeCategoryText(parts[0]) ===
      normalizeCategoryText(gender)
  ) {
    parts.shift();
  }

  return parts.join(" > ") || String(category?.name || "");
};

const findUniqueCategory = (
  categories: StorefrontCategory[],
  predicate: (category: StorefrontCategory) => boolean,
) => {
  const matches = categories.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
};

const findCategoryFromParams = (
  categories: StorefrontCategory[],
  params: ReturnType<typeof getParams>,
) => {
  if (params.categoryId) {
    const found = categories.find(
      (category) =>
        String(category.id) === String(params.categoryId),
    );

    if (found) return found;
  }

  if (params.category) {
    const query = normalizeCategoryText(params.category);

    const exactPath = findUniqueCategory(
      categories,
      (category) =>
        normalizeCategoryText(getCategoryPath(category)) === query,
    );

    if (exactPath) return exactPath;

    const exactName = findUniqueCategory(
      categories,
      (category) =>
        normalizeCategoryText(category.name) === query,
    );

    if (exactName) return exactName;
  }

  if (params.categorySlug) {
    const query = normalizeCategoryText(params.categorySlug);

    const exactSlug = findUniqueCategory(
      categories,
      (category) =>
        normalizeCategoryText(category.slug) === query,
    );

    if (exactSlug) return exactSlug;
  }

  return null;
};

const getCategoryDescendantIds = (
  categories: StorefrontCategory[],
  categoryId: string,
) => {
  const selectedId = String(categoryId || "").trim();
  const ids = new Set<string>();

  if (!selectedId) return ids;

  ids.add(selectedId);

  let changed = true;

  while (changed) {
    changed = false;

    categories.forEach((category) => {
      const id = String(category.id || "").trim();
      const parentId = getCategoryParentId(category);

      if (
        id &&
        parentId &&
        ids.has(parentId) &&
        !ids.has(id)
      ) {
        ids.add(id);
        changed = true;
      }
    });
  }

  return ids;
};

const getProductCategoryId = (product: any) =>
  String(
    product?.categoryId ||
      product?.category_id ||
      "",
  ).trim();

const getProductCategoryPath = (product: any) =>
  normalizeCategoryText(
    product?.categoryPath ||
      product?.category_path ||
      "",
  );

const productMatchesCategory = (
  product: Product,
  category: StorefrontCategory | null,
  categories: StorefrontCategory[],
) => {
  if (!category) return true;

  const allowedIds = getCategoryDescendantIds(
    categories,
    String(category.id),
  );

  const productCategoryId = getProductCategoryId(product);

  if (productCategoryId) {
    return allowedIds.has(productCategoryId);
  }

  const categoryPath = normalizeCategoryText(
    getCategoryPath(category),
  );

  const productCategoryPath = getProductCategoryPath(product);

  return Boolean(
    categoryPath &&
      productCategoryPath &&
      (productCategoryPath === categoryPath ||
        productCategoryPath.startsWith(`${categoryPath} `)),
  );
};

const CollectionTabsContent = ({ title }: { title?: string }) => {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [error, setError] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(loadingMore);
  const [, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const location = useLocation();

  useEffect(() => {
    loadingRef.current = loadingMore;
  }, [loadingMore]);

  const params = useMemo(
    () => getParams(location.search),
    [location.search],
  );

  const preferredGender = useMemo(() => {
    if (params.gender) return toGender(params.gender);

    const stored = localStorage.getItem("preferred_gender");

    return toGender(stored || "Men");
  }, [params.gender, location.pathname]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", preferredGender);
    localStorage.setItem(
      "preferred_gender_url",
      `/${preferredGender.toLowerCase()}`,
    );
  }, [preferredGender]);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setProductsLoading(true);
      setError("");

      try {
        const [data, categoryData] = await Promise.all([
          fetchProductsByGender(preferredGender, 3),
          fetchCategoriesByGender(preferredGender),
        ]);

        if (alive) {
          setProducts(Array.isArray(data) ? data : []);

          setCategories(
            (Array.isArray(categoryData) ? categoryData : [])
              .filter(
                (category: any) =>
                  category?.is_active !== false &&
                  Number(category?.level || 0) > 0,
              )
              .sort((a, b) =>
                getCategoryPath(a).localeCompare(
                  getCategoryPath(b),
                  undefined,
                  { numeric: true },
                ),
              ),
          );
        }
      } catch (loadError: any) {
        if (alive) {
          setProducts([]);
          setCategories([]);
          setError(
            loadError?.message || "Unable to load products",
          );
        }
      } finally {
        if (alive) setProductsLoading(false);
      }
    };

    void loadData();

    return () => {
      alive = false;
    };
  }, [preferredGender]);

  const categoryFromQuery = useMemo(
    () => findCategoryFromParams(categories, params),
    [categories, params],
  );

  const tabs = useMemo(
    () => [
      {
        id: "ALL",
        label: "ALL",
      },
      ...categories.map((category) => ({
        id: String(category.id),
        label: getCategoryLabel(category, preferredGender),
      })),
    ],
    [categories, preferredGender],
  );

  useEffect(() => {
    if (categoryFromQuery) {
      setActiveTab(String(categoryFromQuery.id));
      return;
    }

    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("ALL");
    }
  }, [tabs, activeTab, categoryFromQuery]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(
        currentScrollY - lastScrollY.current,
      );

      if (scrollDifference < 5) return;

      if (
        currentScrollY > lastScrollY.current &&
        currentScrollY > 80
      ) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setVisibleCount(12);
    setLoadingMore(false);
  }, [activeTab, products]);

  const activeCategory = useMemo(() => {
    if (activeTab === "ALL") return null;

    return (
      categories.find(
        (category) => String(category.id) === activeTab,
      ) || null
    );
  }, [activeTab, categories]);

  const currentProducts = useMemo(() => {
    const genderProducts = products.filter(
      (product) =>
        getProductGender(product) ===
        normalizeCategoryText(preferredGender),
    );

    if (activeCategory) {
      return genderProducts.filter((product) =>
        productMatchesCategory(
          product,
          activeCategory,
          categories,
        ),
      );
    }

    let recentlyViewedIds: string[] = [];

    try {
      recentlyViewedIds = JSON.parse(
        localStorage.getItem("recentlyViewed") || "[]",
      );
    } catch {
      recentlyViewedIds = [];
    }

    const recentlyViewed = genderProducts.filter(
      (product: any) =>
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
  }, [
    activeCategory,
    preferredGender,
    products,
    categories,
  ]);

  useEffect(() => {
    const target = observerTarget.current;

    if (!target) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          visibleCount < currentProducts.length
        ) {
          setLoadingMore(true);

          timeoutId = setTimeout(() => {
            setVisibleCount((previous) => previous + 12);
            setLoadingMore(false);
          }, 400);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "400px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [visibleCount, currentProducts.length]);

  const displayedProducts = currentProducts.slice(
    0,
    visibleCount,
  );

  const hasMore = visibleCount < currentProducts.length;

  return (
    <div className="w-full px-2 xl:px-6 bg-white flex flex-col font-sans py-4 pb-12 relative z-10">
      {title ? (
        <h2 className="text-xl md:text-3xl font-source-sans uppercase font-bold text-left md:text-center text-gray-900 mb-4 md:mb-6 px-4 md:px-8 xl:px-12">
          {title}
        </h2>
      ) : null}

      <div className="sticky z-49 bg-white py-3 transition-all duration-500 ease-in-out top-[54px] lg:top-[71px]">
        <div
          className="flex py-1 gap-2 md:gap-4 overflow-x-auto scrollbar-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 whitespace-nowrap px-5 py-2 md:px-6 md:py-[6px] rounded-[15px] text-xs md:text-sm font-medium capitalize transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-900 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 min-h-[50vh]">
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={`tab-loading-${index}`}
                className="min-w-0"
              >
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
              type="button"
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
                <div
                  key={getProductCardKey(product, index)}
                  className="min-w-0"
                >
                  <ProductCard {...product} />
                </div>
              ))}

              {loadingMore &&
                hasMore &&
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="min-w-0"
                  >
                    <ProductCardSkeleton />
                  </div>
                ))}
            </div>

            <div
              ref={observerTarget}
              className="w-full flex flex-col items-center justify-center py-2 mt-2 h-4"
            >
              {!hasMore && displayedProducts.length > 0 ? (
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  You've reached the end
                </p>
              ) : null}
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