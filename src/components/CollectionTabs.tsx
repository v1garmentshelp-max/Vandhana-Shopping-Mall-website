import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { MdOutlineSearchOff } from "react-icons/md";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";
import { fetchProductsByGender } from "../services/productsApi";

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

  const preferredGender = useMemo(() => {
    return localStorage.getItem("preferred_gender") || "Men";
  }, [location.pathname]);

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
    const genderCatId = categories.find(
      (c) =>
        c.level === 0 && c.name.toLowerCase() === preferredGender.toLowerCase(),
    )?.id;

    const level2Cats = categories.filter((c) => {
      if (c.level !== 2) return false;
      const parent = categories.find((p) => p.id === c.parentId);
      return parent?.parentId === genderCatId;
    });

    const activeCategoryIds = new Set(products.map((product) => String(product.categoryId)));

    const uniqueNames = Array.from(
      new Set(
        level2Cats
          .filter((category) => activeCategoryIds.has(String(category.id)))
          .map((category) => category.name),
      ),
    );

    return ["ALL", ...uniqueNames];
  }, [preferredGender, products]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab("ALL");
  }, [tabs, activeTab]);

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
      (p) => p.gender.toLowerCase() === preferredGender.toLowerCase(),
    );

    if (activeTab !== "ALL") {
      const matchingCats = categories.filter(
        (c) => c.level === 2 && c.name === activeTab,
      );
      const catIds = matchingCats.map((c) => String(c.id));
      return genderProducts.filter((p) => catIds.includes(String(p.categoryId)));
    }

    let recentlyViewedIds: string[] = [];
    try {
      recentlyViewedIds = JSON.parse(
        localStorage.getItem("recentlyViewed") || "[]",
      );
    } catch {
      recentlyViewedIds = [];
    }

    const recentlyViewed = genderProducts.filter((p) =>
      recentlyViewedIds.includes(String(p.id)),
    );

    recentlyViewed.sort(
      (a, b) =>
        recentlyViewedIds.indexOf(String(a.id)) -
        recentlyViewedIds.indexOf(String(b.id)),
    );

    const rvCategoryIds = new Set(recentlyViewed.map((p) => p.categoryId));

    const related = genderProducts.filter(
      (p) =>
        !recentlyViewedIds.includes(String(p.id)) &&
        rvCategoryIds.has(p.categoryId),
    );

    const remaining = genderProducts.filter(
      (p) =>
        !recentlyViewedIds.includes(String(p.id)) &&
        !rvCategoryIds.has(p.categoryId),
    );

    return [...recentlyViewed, ...related, ...remaining];
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
              We couldn't find any items in this collection right now. Check
              back later or explore other categories.
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
              {displayedProducts.map((product) => (
                <div key={product.id} className="min-w-0">
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