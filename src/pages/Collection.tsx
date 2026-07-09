import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { FiChevronDown, FiChevronUp, FiFilter, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { BiSortAlt2 } from "react-icons/bi";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";
import { fetchBranchProducts } from "../services/productsApi";

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value: any) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getProductName = (product: any) =>
  normalizeText(product?.title || product?.name || product?.product_name || product?.productName || "");

const getProductGender = (product: any) =>
  normalizeText(product?.gender || product?.category || "");

const getCategoryRoot = (category: any) => {
  if (!category) return null;
  if (category.level === 0) return category;

  const parent = categories.find((item: any) => item.id === category.parentId);
  if (!parent) return null;
  if (parent.level === 0) return parent;

  return categories.find((item: any) => item.id === parent.parentId) || null;
};

const getCategoryRootName = (category: any) => {
  const root = getCategoryRoot(category);
  return root?.name || "";
};

const categoryBelongsToGender = (category: any, gender: string) => {
  if (!gender) return true;
  return normalizeText(getCategoryRootName(category)) === normalizeText(gender);
};

const findCategoryFromParam = (value: any, preferredGender?: string) => {
  const query = normalizeText(value);
  if (!query) return null;

  const candidates = categories.filter((category: any) => {
    const name = normalizeText(category.name);
    const slug = normalizeText(category.slug);
    const genderName = normalizeText(`${getCategoryRootName(category)} ${category.name}`);
    return name === query || slug === query || genderName === query || slug.endsWith(query) || query.endsWith(name);
  });

  if (preferredGender) {
    const genderMatch = candidates.find((category: any) => categoryBelongsToGender(category, preferredGender));
    if (genderMatch) return genderMatch;
  }

  return candidates[0] || null;
};

const getInitialFilters = (searchParams: URLSearchParams) => {
  const initial: Record<string, string[]> = {};
  const cat = searchParams.get("category");
  const storedGender = localStorage.getItem("preferred_gender");
  const matchedCategory = cat ? findCategoryFromParam(cat, storedGender || undefined) || findCategoryFromParam(cat) : null;
  const matchedGender = matchedCategory ? getCategoryRootName(matchedCategory) : "";
  const finalGender = matchedGender || toTitleCase(storedGender || "");

  if (finalGender) initial["Gender"] = [finalGender];
  if (matchedCategory) {
    initial["Category"] = [matchedCategory.name];
  } else if (cat) {
    initial["Category"] = [String(cat).replace(/-/g, " ")];
  }

  return initial;
};

const getCategoryKeywords = (categoryName: string) => {
  const category = normalizeText(categoryName);

  if (category.includes("kurti")) return ["kurti pant set", "kurti"];
  if (category.includes("polo")) return ["polo"];
  if (category.includes("cargo")) return ["cargo pant", "cargo"];
  if (category.includes("night dress")) return ["night dress"];
  if (category.includes("beggi") || category.includes("baggy") || category.includes("bagge")) return ["beggi", "baggy", "bagge"];
  if (category.includes("jean")) return ["jean", "denim"];
  if (category.includes("top") && !category.includes("topwear")) return ["top", "h s top"];
  if (category.includes("t shirt") || category.includes("tshirt") || category.includes("tee")) return ["t shirt", "tshirt", "oversized t shirt"];
  if (category.includes("pant")) return ["pant"];
  if (category.includes("shirt")) return ["shirt"];
  if (category.includes("dress")) return ["dress", "frock"];
  if (category.includes("jogger")) return ["jogger"];
  if (category.includes("short")) return ["short"];
  if (category.includes("pyjama") || category.includes("pajama")) return ["pyjama", "pajama"];
  if (category.includes("vest")) return ["vest"];
  if (category.includes("hoodie")) return ["hoodie"];
  if (category.includes("sweatshirt")) return ["sweatshirt"];

  return category.split(" ").filter((item) => item.length > 2);
};

const productMatchesKeyword = (title: string, keyword: string, categoryName: string) => {
  const t = normalizeText(title);
  const k = normalizeText(keyword);
  const c = normalizeText(categoryName);

  if (!t || !k) return false;

  if (c.includes("kurti")) {
    return t.includes("kurti pant set") || t.includes("kurti");
  }

  if (c.includes("polo")) {
    return t.includes("polo");
  }

  if (c.includes("cargo")) {
    return t.includes("cargo");
  }

  if (c.includes("night dress")) {
    return t.includes("night dress");
  }

  if (c.includes("beggi") || c.includes("baggy") || c.includes("bagge")) {
    return t.includes("beggi") || t.includes("baggy") || t.includes("bagge");
  }

  if (c.includes("jean")) {
    return t.includes("jean") || t.includes("denim");
  }

  if (c.includes("top") && !c.includes("topwear")) {
    return t.includes("top") || t.includes("h s top");
  }

  if (c.includes("t shirt") || c.includes("tshirt") || c.includes("tee")) {
    return (t.includes("t shirt") || t.includes("tshirt") || t.includes("oversized")) && !t.includes("polo");
  }

  if (c.includes("pant")) {
    if (t.includes("kurti pant set")) return false;
    if (c === "pants" || c.endsWith(" pants")) {
      return t.includes("pant") && !t.includes("jean") && !t.includes("beggi") && !t.includes("bagge") && !t.includes("cargo");
    }
    return t.includes("pant");
  }

  if (c.includes("shirt")) {
    return t.includes("shirt") && !t.includes("t shirt") && !t.includes("tshirt") && !t.includes("polo");
  }

  return t.includes(k);
};

const productMatchesCategoryName = (product: Product, categoryName: string) => {
  const title = getProductName(product);
  const keywords = getCategoryKeywords(categoryName);
  return keywords.some((keyword) => productMatchesKeyword(title, keyword, categoryName));
};

const productMatchesLevel1Category = (product: Product, category: any) => {
  const title = getProductName(product);
  const categoryName = normalizeText(category?.name || category?.slug);

  if (categoryName.includes("topwear")) {
    return (
      title.includes("t shirt") ||
      title.includes("tshirt") ||
      title.includes("shirt") ||
      title.includes("polo") ||
      title.includes("top") ||
      title.includes("kurti") ||
      title.includes("dress") ||
      title.includes("frock") ||
      title.includes("vest") ||
      title.includes("hoodie") ||
      title.includes("sweatshirt")
    );
  }

  if (categoryName.includes("bottomwear")) {
    return (
      title.includes("pant") ||
      title.includes("jean") ||
      title.includes("denim") ||
      title.includes("cargo") ||
      title.includes("jogger") ||
      title.includes("short") ||
      title.includes("pyjama") ||
      title.includes("pajama") ||
      title.includes("beggi") ||
      title.includes("bagge") ||
      title.includes("baggy")
    );
  }

  return productMatchesCategoryName(product, category.name || "");
};

const productMatchesCategory = (product: Product, category: any) => {
  if (!category) return true;
  const productGender = getProductGender(product);
  const rootGender = normalizeText(getCategoryRootName(category));

  if (rootGender && productGender && rootGender !== productGender) return false;

  if (category.level === 0) return true;
  if (category.level === 1) return productMatchesLevel1Category(product, category);

  return productMatchesCategoryName(product, category.name || category.slug || "");
};

const getValidSelectedCategories = (selectedNames: string[], gender: string) => {
  const selectedNormalized = selectedNames.map(normalizeText).filter(Boolean);

  const matched = categories.filter((category: any) => {
    const name = normalizeText(category.name);
    const slug = normalizeText(category.slug);
    const genderName = normalizeText(`${getCategoryRootName(category)} ${category.name}`);
    const isSelected = selectedNormalized.some((selected) => selected === name || selected === slug || selected === genderName || slug.endsWith(selected));
    return isSelected && categoryBelongsToGender(category, gender);
  });

  const selectedLevel2Ids = new Set(
    matched.filter((category: any) => category.level === 2).map((category: any) => category.id),
  );

  const effective: any[] = [];

  matched
    .filter((category: any) => category.level === 2)
    .forEach((category: any) => effective.push(category));

  matched
    .filter((category: any) => category.level === 1)
    .forEach((category: any) => {
      const children = categories.filter((item: any) => item.parentId === category.id);
      const selectedChildren = children.filter((child: any) => selectedLevel2Ids.has(child.id));
      if (!selectedChildren.length) effective.push(category);
    });

  matched
    .filter((category: any) => category.level === 0)
    .forEach((category: any) => effective.push(category));

  return effective;
};

const getFilterConfig = (gender: string, products: Product[]) => {
  const genderCats = categories.filter(
    (c: any) => c.name.toLowerCase() === gender.toLowerCase() && c.level === 0,
  );
  const genderCatIds = genderCats.map((c: any) => c.id);
  const level1Cats = categories.filter(
    (c: any) => c.level === 1 && genderCatIds.includes(c.parentId || ""),
  );

  const categoryOptions: any[] = [];
  level1Cats.forEach((l1: any) => {
    categoryOptions.push({ label: l1.name, value: l1.name, isLevel1: true });
    const level2Cats = categories.filter((c: any) => c.parentId === l1.id);
    level2Cats.forEach((l2: any) => {
      categoryOptions.push({ label: l2.name, value: l2.name, isLevel1: false });
    });
  });

  const genderProducts = products.filter(
    (product: any) => getProductGender(product) === normalizeText(gender),
  );

  const brandOptions = Array.from(
    new Set(genderProducts.map((product: any) => product.brand || product.brand_name || "").filter(Boolean)),
  );

  const colorOptions = Array.from(
    new Set(genderProducts.flatMap((product: any) => product.colors || product.colours || []).filter(Boolean)),
  );

  const sizeOptions = Array.from(
    new Set(genderProducts.flatMap((product: any) => product.sizes || []).filter(Boolean)),
  );

  return {
    Category: categoryOptions,
    Sizes: sizeOptions.length ? sizeOptions : ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
    Brand: brandOptions.length ? brandOptions : ["Vandhana"],
    Color: colorOptions.length ? colorOptions : ["Black", "White", "Red", "Blue", "Green", "Yellow", "Grey", "Brown"],
    Discount: ["10% and above", "20% and above", "30% and above", "40% and above", "50% and above"],
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

const getDiscountPercent = (product: Product) => {
  const original = Number((product as any).originalPrice || (product as any).original_price || (product as any).mrp || product.price || 0);
  const price = Number(product.price || 0);
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
};

export default function Collection() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(() => getInitialFilters(searchParams));
  const [sortBy, setSortBy] = useState<SortOption>("Popularity");
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
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

  const filterConfig = useMemo(() => {
    return getFilterConfig(
      activeFilters["Gender"]?.[0] ||
        localStorage.getItem("preferred_gender") ||
        "Men",
      products,
    );
  }, [activeFilters, products]);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError("");

      try {
        const data = await fetchBranchProducts(3);
        if (alive) setProducts(data);
      } catch (err: any) {
        if (alive) {
          setProducts([]);
          setProductsError(err?.message || "Unable to load products");
        }
      } finally {
        if (alive) setProductsLoading(false);
      }
    };

    void loadProducts();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");

    if (cat) {
      setActiveFilters((prev) => {
        const currentGender = prev["Gender"]?.[0] || localStorage.getItem("preferred_gender") || "";
        const matched = findCategoryFromParam(cat, currentGender) || findCategoryFromParam(cat);
        const matchedGender = matched ? getCategoryRootName(matched) : "";
        const nextGender = matchedGender || currentGender || "Men";
        const nextCategory = matched ? matched.name : String(cat).replace(/-/g, " ");

        localStorage.setItem("preferred_gender", nextGender);
        localStorage.setItem("preferred_gender_url", `/${nextGender.toLowerCase()}`);

        return {
          ...prev,
          Gender: [nextGender],
          Category: [nextCategory],
        };
      });
    }
  }, [searchParams]);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeFilters, sortBy]);

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
        const nextValues = current.filter((v) => v !== value);
        const next = { ...prev };
        if (nextValues.length) next[category] = nextValues;
        else delete next[category];
        return next;
      }
      return { ...prev, [category]: [...current, value] };
    });
  };

  const clearAllFilters = () => {
    const gen = activeFilters["Gender"]?.[0] || localStorage.getItem("preferred_gender");
    if (gen) {
      setActiveFilters({ Gender: [gen] });
    } else {
      setActiveFilters({});
    }
  };

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
    let result = [...products];

    if (activeFilters["Gender"]?.length) {
      const activeGenders = activeFilters["Gender"].map((g) => normalizeText(g));
      result = result.filter((p: any) =>
        activeGenders.includes(getProductGender(p)),
      );
    }

    if (activeFilters["Category"]?.length) {
      const selectedCatNames = activeFilters["Category"];
      const currentGender = activeFilters["Gender"]?.[0] || localStorage.getItem("preferred_gender") || "";
      const validCats = getValidSelectedCategories(selectedCatNames, currentGender);

      if (validCats.length) {
        result = result.filter((product) =>
          validCats.some((category) => productMatchesCategory(product, category)),
        );
      } else {
        result = result.filter((product) =>
          selectedCatNames.some((categoryName) => productMatchesCategoryName(product, categoryName)),
        );
      }
    }

    if (activeFilters["Sizes"]?.length) {
      result = result.filter((p: any) =>
        (p.sizes || []).some((s: string) => activeFilters["Sizes"].includes(s)),
      );
    }

    if (activeFilters["Color"]?.length) {
      result = result.filter((p: any) =>
        (p.colors || p.colours || []).some((c: string) => activeFilters["Color"].includes(c)),
      );
    }

    if (activeFilters["Brand"]?.length) {
      result = result.filter((p: any) =>
        activeFilters["Brand"].includes(p.brand || p.brand_name || ""),
      );
    }

    if (activeFilters["Discount"]?.length) {
      const required = activeFilters["Discount"].map((item) => {
        const match = item.match(/\d+/);
        return match ? Number(match[0]) : 0;
      });
      const minRequired = Math.min(...required);
      result = result.filter((p) => getDiscountPercent(p) >= minRequired);
    }

    switch (sortBy) {
      case "Price : High to Low":
        result.sort((a: any, b: any) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "Price : Low to High":
        result.sort((a: any, b: any) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "New Arrival":
        result.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime(),
        );
        break;
      case "Popularity":
      default:
        break;
    }

    return result;
  }, [activeFilters, sortBy, products]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredProducts.length) {
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
  }, [visibleCount, filteredProducts.length]);

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
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight capitalize">
              {(activeFilters["Gender"] || ["All"]).join(", ")}{" "}
              {activeFilters["Category"]?.[0] || searchParams.get("category")?.replace(/-/g, " ") || "Products"}
            </h1>
            <span className="text-gray-500 text-sm hidden md:inline">
              {filteredProducts.length} Products
            </span>
          </div>

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

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 relative">
        {productsError ? (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {productsError}
          </div>
        ) : null}

        <div className="flex gap-8 items-start">
          <aside
            className="hidden lg:block w-64 shrink-0 sticky top-24 h-[calc(100vh-100px)] overflow-y-auto overscroll-contain pr-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">
                Filters
                {filterCount > 0 && (
                  <span className="text-black text-base ml-1">
                    ({Math.max(filterCount - 1, 0)})
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

          <div className="flex-1 w-full">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={`loading-${idx}`} className="min-w-0">
                    <ProductCardSkeleton />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.slice(0, visibleCount).map((product: any) => (
                    <ProductCard key={`${product.id}-${product.variant_id || product.variantId || product.product_id || product.productId || ""}`} {...product} />
                  ))}
                  {isLoadingMore &&
                    visibleCount < filteredProducts.length &&
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`col-skeleton-${idx}`} className="min-w-0">
                        <ProductCardSkeleton />
                      </div>
                    ))}
                </div>
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

        <div className="flex-1 flex overflow-hidden bg-[#f9f9f9]">
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

          <div className="w-2/3 bg-white p-4 overflow-y-auto">
            <FilterCheckboxes
              categoryKey={mobileActiveTab}
              options={(filterConfig as any)[mobileActiveTab] || []}
            />
          </div>
        </div>

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