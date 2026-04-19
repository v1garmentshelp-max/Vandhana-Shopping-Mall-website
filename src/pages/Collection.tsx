import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { FiChevronDown, FiChevronUp, FiFilter, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { BiSortAlt2 } from "react-icons/bi";
import productData from "../Data/Products.json";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";

const PRODUCTS = productData as unknown as Product[];

const getFilterConfig = (gender: string) => {
  const genderCats = categories.filter(
    (c) => c.name.toLowerCase() === gender.toLowerCase() && c.level === 0,
  );
  const genderCatIds = genderCats.map((c) => c.id);
  const level1Cats = categories.filter(
    (c) => c.level === 1 && genderCatIds.includes(c.parentId || ""),
  );

  const categoryOptions: any[] = [];
  level1Cats.forEach((l1) => {
    categoryOptions.push({ label: l1.name, value: l1.name, isLevel1: true });
    const level2Cats = categories.filter((c) => c.parentId === l1.id);
    level2Cats.forEach((l2) => {
      categoryOptions.push({ label: l2.name, value: l2.name, isLevel1: false });
    });
  });

  return {
    Category: categoryOptions,
    Sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
    Brand: ["Bewakoof"],
    Color: [
      "Black",
      "White",
      "Red",
      "Blue",
      "Green",
      "Yellow",
      "Grey",
      "Brown",
    ],
    Discount: [
      "10% and above",
      "20% and above",
      "30% and above",
      "40% and above",
      "50% and above",
    ],
    Ratings: [4, 3, 2, 1],
  };
};

type SortOption =
  | "Popularity"
  | "New Arrival"
  | "Price : High to Low"
  | "Price : Low to High";
const SORT_OPTIONS: SortOption[] = [
  "Popularity",
  "New Arrival",
  "Price : High to Low",
  "Price : Low to High",
];

export default function Collection() {
  const [searchParams] = useSearchParams();

  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    () => {
      const initial: Record<string, string[]> = {};
      const cat = searchParams.get("category");
      const gen = localStorage.getItem("preferred_gender");
      const capitalizedGen = gen
        ? gen.charAt(0).toUpperCase() + gen.slice(1).toLowerCase()
        : "";

      if (capitalizedGen) initial["Gender"] = [capitalizedGen];
      if (cat) {
        const capitalizedGen = initial["Gender"]?.[0];
        const parentId = categories.find(
          (c) => c.level === 0 && c.name === capitalizedGen,
        )?.id;

        const matched =
          categories.find(
            (c) => c.slug.includes(cat) && c.parentId === parentId,
          ) || categories.find((c) => c.slug.includes(cat));

        if (matched) {
          initial["Category"] = [matched.name];
        } else {
          initial["Category"] = [cat.replace(/-/g, " ")];
        }
      }

      return initial;
    },
  );

  const filterConfig = useMemo(() => {
    return getFilterConfig(
      activeFilters["Gender"]?.[0] ||
        localStorage.getItem("preferred_gender") ||
        "Men",
    );
  }, [activeFilters]);
  const [sortBy, setSortBy] = useState<SortOption>("Popularity");
  const [expandedFilters, setExpandedFilters] = useState<
    Record<string, boolean>
  >({
    Gender: true,
    Category: true,
    Sizes: true,
  });

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState("Sizes");
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeFilters, sortBy]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Use setTimeout for a slight simulated delay to show skeletons
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => prev + 12);
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
    };
  }, [visibleCount, activeFilters, sortBy]);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setActiveFilters((prev) => {
        const capitalizedGen =
          prev["Gender"]?.[0] || localStorage.getItem("preferred_gender") || "";

        const parentId = capitalizedGen
          ? categories.find(
              (c) =>
                c.level === 0 &&
                c.name.toLowerCase() === capitalizedGen.toLowerCase(),
            )?.id
          : undefined;

        const matched = parentId
          ? categories.find(
              (c) => c.slug.includes(cat) && c.parentId === parentId,
            ) || categories.find((c) => c.slug.includes(cat))
          : categories.find((c) => c.slug.includes(cat));

        const newCategory = matched ? matched.name : cat.replace(/-/g, " ");

        if (!prev["Category"] || !prev["Category"].includes(newCategory)) {
          return { ...prev, Category: [newCategory] };
        }
        return prev;
      });
    } else {
      setActiveFilters((prev) => {
        if (prev["Category"]?.length > 0 && prev["Category"].length === 1) {
          const next = { ...prev };
          delete next["Category"];
          return next;
        }
        return prev;
      });
    }
  }, [searchParams]);

  // Prevent scroll when modal open
  useEffect(() => {
    if (isMobileFilterOpen || isMobileSortOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileFilterOpen, isMobileSortOpen]);

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[category] || [];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      }
      return { ...prev, [category]: [...current, value] };
    });
  };

  const clearAllFilters = () => setActiveFilters({});

  const filterCount = Object.values(activeFilters).reduce(
    (acc, curr) => acc + curr.length,
    0,
  );

  const toggleExpanded = (category: string) => {
    setExpandedFilters((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS];

    if (activeFilters["Gender"]?.length) {
      const activeGenders = activeFilters["Gender"].map((g) => g.toLowerCase());
      result = result.filter((p) =>
        activeGenders.includes(p.gender.toLowerCase()),
      );
    }

    if (activeFilters["Category"]?.length) {
      const selectedCatNames = activeFilters["Category"].map((c) =>
        c.toLowerCase(),
      );

      const currentGender = activeFilters["Gender"]?.[0]?.toLowerCase();
      const currentGenderId = categories.find(
        (c) => c.level === 0 && c.name.toLowerCase() === currentGender,
      )?.id;

      const matchedCats = categories.filter((c) =>
        selectedCatNames.includes(c.name.toLowerCase()),
      );

      // Filter out categories not under the current gender
      const validCats = currentGenderId
        ? matchedCats.filter((c) => {
            if (c.level === 0) return c.id === currentGenderId;
            if (c.level === 1) return c.parentId === currentGenderId;
            if (c.level === 2) {
              const parent = categories.find((p) => p.id === c.parentId);
              return parent?.parentId === currentGenderId;
            }
            return true;
          })
        : matchedCats;

      const expandedCatIds = new Set<string>();
      const selectedLevel2Ids = new Set(
        validCats.filter((c) => c.level === 2).map((c) => c.id),
      );

      const selectedLevel1 = validCats.filter((c) => c.level === 1);

      selectedLevel1.forEach((l1) => {
        const children = categories.filter((c) => c.parentId === l1.id);
        const selectedChildren = children.filter((c) =>
          selectedLevel2Ids.has(c.id),
        );

        if (selectedChildren.length > 0) {
          // If specific children are selected, ONLY include those
          selectedChildren.forEach((c) => expandedCatIds.add(c.id));
        } else {
          // Otherwise include all children of the level 1 category
          children.forEach((c) => expandedCatIds.add(c.id));
        }
      });

      // Add any explicitly selected level 2s that weren't caught above
      selectedLevel2Ids.forEach((id) => expandedCatIds.add(id));

      result = result.filter((p) => expandedCatIds.has(p.categoryId));
    }

    if (activeFilters["Sizes"]?.length) {
      result = result.filter((p) =>
        p.sizes?.some((s) => activeFilters["Sizes"].includes(s)),
      );
    }

    if (activeFilters["Color"]?.length) {
      result = result.filter((p) =>
        p.colors?.some((c) => activeFilters["Color"].includes(c)),
      );
    }

    if (activeFilters["Brand"]?.length) {
      result = result.filter((p) =>
        activeFilters["Brand"].includes(p.brand || "Bewakoof"),
      );
    }

    // Sort
    switch (sortBy) {
      case "Price : High to Low":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Price : Low to High":
        result.sort((a, b) => a.price - b.price);
        break;
      case "New Arrival":
      case "Popularity":
      default:
        // Assume default order for popularity/new arrival for now
        break;
    }

    return result;
  }, [activeFilters, sortBy]);

  const FilterCheckboxes = ({
    categoryKey,
    options,
  }: {
    categoryKey: string;
    options: any[];
  }) => {
    return (
      <div className="flex flex-col gap-3 mt-3 px-1">
        {options.map((optionObj, idx) => {
          const isObj = typeof optionObj === "object" && optionObj !== null;
          const optionValue = isObj ? optionObj.value : optionObj.toString();
          const optionLabel = isObj ? optionObj.label : optionObj.toString();
          const isLevel1 = isObj ? optionObj.isLevel1 : false;

          const isSelected = activeFilters[categoryKey]?.includes(optionValue);
          return (
            <label
              key={`${optionValue}-${idx}`}
              className={`flex items-center capitalize justify-between cursor-pointer group ${isObj && !isLevel1 ? "ml-5" : ""} ${isObj && isLevel1 ? "mt-3 mb-1" : ""}`}
              onClick={() => toggleFilter(categoryKey, optionValue)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-black"
                      : "border-gray-300 bg-white group-hover:border-gray-400"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 current-color"
                      viewBox="0 0 12 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 5L4.5 8.5L11 1.5"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm tracking-wide ${
                    isSelected ? "text-gray-900 font-bold" : "text-gray-500"
                  } ${isLevel1 ? "font-bold text-gray-800" : ""}`}
                >
                  {categoryKey === "Ratings" ? (
                    <div className="flex items-center gap-1">
                      {[...Array(5 - optionValue)].map((_, i) => (
                        <FaStar key={i} className="text-[#f5b82e]" size={12} />
                      ))}
                      {/* {[...Array(5 - optionValue)].map((_, i) => (
                        <FaRegStar
                          key={i}
                          className="text-gray-300"
                          size={12}
                        />
                      ))} */}
                      <span className="ml-1 text-xs opacity-70">&amp; up</span>
                    </div>
                  ) : (
                    optionLabel
                  )}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen font-montserrat">
      {/* HEADER BAR */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight capitalize">
              {activeFilters["Gender"] || "All"}{" "}
              {searchParams.get("category") || "Products"}
            </h1>
            <span className="text-gray-500 text-sm hidden md:inline">
              {filteredProducts.length} Products
            </span>
          </div>

          {/* Desktop Sort */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">Sort by :</span>
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900">
                {sortBy}
                <FiChevronDown />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                {SORT_OPTIONS.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer font-medium"
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 relative">
        <div className="flex gap-8 items-start">
          {/* DESKTOP SIDEBAR */}
          <aside
            className="hidden lg:block w-64 shrink-0 sticky top-24 h-[calc(100vh-100px)] overflow-y-auto overscroll-contain pr-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">
                Filters
                {filterCount > 0 && (
                  <span className="text-black text-base ml-1">
                    ({filterCount - 1})
                  </span>
                )}
              </h2>
              {filterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-teal-500 hover:text-teal-700 hover:underline font-medium transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {Object.entries(filterConfig).map(([key, options]) => (
                <div key={key} className="border-b border-gray-50 pb-4">
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="flex w-full items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                      {key}
                    </span>
                    {expandedFilters[key] ? (
                      <FiChevronUp className="text-gray-400" />
                    ) : (
                      <FiChevronDown className="text-gray-400" />
                    )}
                  </button>
                  {expandedFilters[key] && (
                    <div
                      className="mt-4 pr-2"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      <FilterCheckboxes categoryKey={key} options={options} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1 w-full">
            {filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.slice(0, visibleCount).map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                  {isLoadingMore &&
                    visibleCount < filteredProducts.length &&
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`col-skeleton-${idx}`} className="min-w-0">
                        <ProductCardSkeleton />
                      </div>
                    ))}
                </div>
                {/* Intersection Observer Target */}
                {visibleCount < filteredProducts.length && (
                  <div
                    ref={observerTarget}
                    className="w-full h-4 flex items-center justify-center mt-2"
                  ></div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FiFilter size={48} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters to find what you're looking for.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-10 py-4 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-105 transition-transform"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 grid grid-cols-2 divide-x divide-gray-200 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setIsMobileSortOpen(true)}
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <BiSortAlt2 size={20} />
          Sort
          {sortBy !== "Popularity" && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <FiFilter size={18} />
          Filter
          {filterCount > 0 && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          )}
        </button>
      </div>

      {/* MOBILE SORT MODAL */}
      {isMobileSortOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm transition-all">
          <div className="w-full bg-white rounded-t-3xl pt-6 pb-8 px-6 animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Sort by
              </h3>
              <button
                onClick={() => setIsMobileSortOpen(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-5">
              {SORT_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span
                    className={`text-[17px] ${sortBy === opt ? "font-bold text-black" : "text-gray-600 font-medium"}`}
                  >
                    {opt}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-[1.5px] p-[3px] flex items-center justify-center transition-colors ${sortBy === opt ? "border-primary" : "border-gray-400 group-hover:border-gray-500"}`}
                  >
                    {sortBy === opt && (
                      <div className="w-full h-full bg-primary rounded-full" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FILTER MODAL */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300 ${
          isMobileFilterOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="pt-4 pb-3 px-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            Filters {filterCount > 0 ? `(${filterCount})` : ""}
          </h3>
          <button
            onClick={() => setIsMobileFilterOpen(false)}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* 2 Pane Layout */}
        <div className="flex-1 flex overflow-hidden bg-[#f9f9f9]">
          {/* Left Tabs */}
          <div
            className="w-1/3 border-r border-gray-200 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {Object.keys(filterConfig).map((key) => {
              const isActive = mobileActiveTab === key;
              const activeCount = activeFilters[key]?.length || 0;
              return (
                <button
                  key={key}
                  onClick={() => setMobileActiveTab(key)}
                  className={`w-full text-left py-4 px-3 text-[13px] uppercase tracking-wider font-bold transition-colors relative ${
                    isActive
                      ? "bg-white text-black"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  )}
                  {key}
                  {activeCount > 0 && (
                    <span className="ml-1 text-primary">({activeCount})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Checkboxes */}
          <div className="w-2/3 bg-white p-4 overflow-y-auto">
            <FilterCheckboxes
              categoryKey={mobileActiveTab}
              options={(filterConfig as any)[mobileActiveTab] || []}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
          <button
            onClick={clearAllFilters}
            className="flex-1 py-3.5 border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wider text-sm rounded-md"
          >
            Clear All
          </button>
          <button
            onClick={() => setIsMobileFilterOpen(false)}
            className="flex-1 py-3.5 bg-primary border-2 border-primary text-black font-bold uppercase tracking-wider text-sm rounded-md"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
