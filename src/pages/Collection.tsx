import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { FiChevronDown, FiChevronUp, FiFilter, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { BiSortAlt2 } from "react-icons/bi";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import type { Product, ProductGender } from "../Models/Product";
import {
  fetchBranchProducts,
  fetchCategoriesTree,
  flattenCategoryTree,
  type StorefrontCategory,
} from "../services/productsApi";

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleGender = (value: any): ProductGender => {
  const text = normalizeText(value);

  if (text === "women") return "Women";
  if (text === "kids" || text === "kid") return "Kids";

  return "Men";
};

const getProductGender = (product: any) =>
  normalizeText(product?.gender || product?.category || "");

const getProductSelectedColor = (product: any) =>
  String(
    product?.selectedColor ||
      product?.selected_color ||
      product?.colour ||
      product?.color ||
      "",
  ).trim();

const getProductCardKey = (product: any) => {
  const productId = normalizeText(
    product?.productId ||
      product?.product_id ||
      product?.id,
  );

  const categoryId = normalizeText(
    product?.categoryId ||
      product?.category_id,
  );

  const color = normalizeText(
    product?.selectedColor ||
      product?.selected_color ||
      product?.selectedColour ||
      product?.selected_colour ||
      product?.colour ||
      product?.color,
  );

  const patternCode = normalizeText(
    product?.patternCode ||
      product?.pattern_code,
  );

  const brand = normalizeText(
    product?.brand ||
      product?.brand_name,
  );

  const title = normalizeText(
    product?.title ||
      product?.product_name ||
      product?.name,
  );

  return [
    productId || "product",
    categoryId || "category",
    color || "default",
    patternCode,
    brand,
    title,
  ]
    .filter(Boolean)
    .join("|");
};

const findCategoryFromParams = (
  categories: StorefrontCategory[],
  searchParams: URLSearchParams,
) => {
  const categoryId =
    searchParams.get("category_id") ||
    searchParams.get("categoryId") ||
    "";

  const categorySlug =
    searchParams.get("category_slug") ||
    searchParams.get("categorySlug") ||
    "";

  const category =
    searchParams.get("category") ||
    "";

  if (categoryId) {
    const found = categories.find(
      (item) =>
        String(item.id) === String(categoryId),
    );

    if (found) return found;
  }

  if (categorySlug) {
    const found = categories.find(
      (item) =>
        normalizeText(item.slug) ===
        normalizeText(categorySlug),
    );

    if (found) return found;
  }

  if (category) {
    const query = normalizeText(category);

    const found = categories.find((item) => {
      const name = normalizeText(item.name);
      const slug = normalizeText(item.slug);
      const path = normalizeText(
        item.categoryPath ||
          item.category_path,
      );

      return (
        name === query ||
        slug === query ||
        path === query ||
        slug.endsWith(query) ||
        query.endsWith(name)
      );
    });

    if (found) return found;
  }

  return null;
};

const getCategoryGender = (
  category: StorefrontCategory | null,
): ProductGender | "" => {
  if (!category) return "";

  const gender = String(
    category.gender || "",
  ).toUpperCase();

  if (gender === "MEN") return "Men";
  if (gender === "WOMEN") return "Women";
  if (gender === "KIDS") return "Kids";

  return "";
};

const getCategoryLabel = (
  category: StorefrontCategory,
  selectedGender: string,
) => {
  const level = Number(category.level || 0);

  if (
    selectedGender === "Kids" &&
    level === 1
  ) {
    return `Kids > ${category.name}`;
  }

  return category.name;
};

const getCategoryParentId = (
  category: StorefrontCategory,
) =>
  String(
    category.parentId ||
      category.parent_id ||
      "",
  ).trim();

const getProductCategoryId = (
  product: any,
) =>
  String(
    product?.categoryId ||
      product?.category_id ||
      "",
  ).trim();

const getProductParentCategoryId = (
  product: any,
) =>
  String(
    product?.parentCategoryId ||
      product?.parent_category_id ||
      "",
  ).trim();

const getProductCategorySlug = (
  product: any,
) =>
  normalizeText(
    product?.categorySlug ||
      product?.category_slug ||
      "",
  );

const getProductCategoryName = (
  product: any,
) =>
  normalizeText(
    product?.categoryName ||
      product?.category_name ||
      "",
  );

const getProductCategoryPath = (
  product: any,
) =>
  normalizeText(
    product?.categoryPath ||
      product?.category_path ||
      "",
  );

const getCategoryDescendantIds = (
  categories: StorefrontCategory[],
  categoryId: string,
) => {
  const selectedId = String(
    categoryId || "",
  ).trim();

  const ids = new Set<string>();

  if (!selectedId) return ids;

  ids.add(selectedId);

  let changed = true;

  while (changed) {
    changed = false;

    categories.forEach((category) => {
      const id = String(
        category.id || "",
      ).trim();

      const parentId =
        getCategoryParentId(category);

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

const productMatchesCategory = (
  product: Product,
  category: StorefrontCategory,
  categories: StorefrontCategory[],
) => {
  const allowedIds =
    getCategoryDescendantIds(
      categories,
      String(category.id),
    );

  const productCategoryId =
    getProductCategoryId(product);

  if (productCategoryId) {
    return allowedIds.has(productCategoryId);
  }

  const productParentCategoryId =
    getProductParentCategoryId(product);

  if (
    productParentCategoryId &&
    allowedIds.has(productParentCategoryId)
  ) {
    return true;
  }

  const categorySlug =
    normalizeText(category.slug);

  const productCategorySlug =
    getProductCategorySlug(product);

  if (
    categorySlug &&
    productCategorySlug &&
    categorySlug === productCategorySlug
  ) {
    return true;
  }

  const categoryName =
    normalizeText(category.name);

  const productCategoryName =
    getProductCategoryName(product);

  if (
    categoryName &&
    productCategoryName &&
    categoryName === productCategoryName
  ) {
    return true;
  }

  const categoryPath =
    normalizeText(
      category.categoryPath ||
        category.category_path,
    );

  const productCategoryPath =
    getProductCategoryPath(product);

  return Boolean(
    categoryPath &&
      productCategoryPath &&
      (
        productCategoryPath === categoryPath ||
        productCategoryPath.startsWith(
          `${categoryPath} `,
        )
      ),
  );
};

const getCategoriesForGender = (
  categories: StorefrontCategory[],
  gender: string,
) => {
  const genderKey =
    gender === "Women"
      ? "WOMEN"
      : gender === "Kids"
        ? "KIDS"
        : "MEN";

  return categories.filter(
    (item) =>
      item.gender === genderKey &&
      Number(item.level || 0) > 0,
  );
};

const getCollectionProductIdentity = (
  product: any,
) => {
  const productId = String(
    product?.productId ||
      product?.product_id ||
      "",
  ).trim();

  const categoryId = normalizeText(
    product?.categoryId ||
      product?.category_id,
  );

  const color = normalizeText(
    product?.selectedColor ||
      product?.selected_color ||
      product?.selectedColour ||
      product?.selected_colour ||
      product?.colour ||
      product?.color ||
      "",
  );

  if (productId) {
    return [
      `product:${productId}`,
      `category:${categoryId || "none"}`,
      `color:${color || "default"}`,
    ].join("|");
  }

  const patternCode = normalizeText(
    product?.patternCode ||
      product?.pattern_code,
  );

  if (patternCode) {
    return [
      "pattern",
      normalizeText(
        product?.gender ||
          product?.category,
      ),
      categoryId,
      normalizeText(
        product?.brand ||
          product?.brand_name,
      ),
      patternCode,
      color || "default",
    ].join("|");
  }

  return [
    "details",
    normalizeText(
      product?.gender ||
        product?.category,
    ),
    categoryId,
    normalizeText(
      product?.brand ||
        product?.brand_name,
    ),
    normalizeText(
      product?.title ||
        product?.product_name ||
        product?.name,
    ),
    color || "default",
  ].join("|");
};

const dedupeCollectionProducts = (
  items: Product[],
) => {
  const seen = new Set<string>();

  return items.filter((product: any) => {
    const key =
      getCollectionProductIdentity(product);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

const getInitialGender = (
  searchParams: URLSearchParams,
): ProductGender => {
  const queryGender =
    searchParams.get("gender") || "";

  if (queryGender) {
    return toTitleGender(queryGender);
  }

  const storedGender =
    localStorage.getItem(
      "preferred_gender",
    ) || "";

  return toTitleGender(
    storedGender || "Men",
  );
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

const getDiscountPercent = (
  product: Product,
) => {
  const original = Number(
    (product as any).originalPrice ||
      (product as any).original_price ||
      (product as any).mrp ||
      product.price ||
      0,
  );

  const price = Number(
    product.price || 0,
  );

  if (!original || original <= price) {
    return 0;
  }

  return Math.round(
    ((original - price) / original) *
      100,
  );
};

export default function Collection() {
  const [searchParams] =
    useSearchParams();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<StorefrontCategory[]>([]);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(true);

  const [
    productsError,
    setProductsError,
  ] = useState("");

  const [
    activeFilters,
    setActiveFilters,
  ] = useState<
    Record<string, string[]>
  >(() => ({
    Gender: [
      getInitialGender(searchParams),
    ],
  }));

  const [sortBy, setSortBy] =
    useState<SortOption>("Popularity");

  const [
    expandedFilters,
    setExpandedFilters,
  ] = useState<
    Record<string, boolean>
  >({
    Gender: true,
    Category: true,
    Sizes: true,
  });

  const [
    isMobileFilterOpen,
    setIsMobileFilterOpen,
  ] = useState(false);

  const [
    isMobileSortOpen,
    setIsMobileSortOpen,
  ] = useState(false);

  const [
    mobileActiveTab,
    setMobileActiveTab,
  ] = useState("Sizes");

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(12);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const observerTarget =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setProductsLoading(true);
      setProductsError("");

      try {
        const [productData, tree] =
          await Promise.all([
            fetchBranchProducts(3),
            fetchCategoriesTree(),
          ]);

        if (alive) {
          setProducts(productData);

          setCategories(
            flattenCategoryTree(tree),
          );
        }
      } catch (error: any) {
        if (alive) {
          setProducts([]);
          setCategories([]);

          setProductsError(
            error?.message ||
              "Unable to load products",
          );
        }
      } finally {
        if (alive) {
          setProductsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!categories.length) return;

    const matchedCategory =
      findCategoryFromParams(
        categories,
        searchParams,
      );

    const matchedGender =
      getCategoryGender(
        matchedCategory,
      );

    const queryGender =
      searchParams.get("gender");

    const nextGender =
      matchedGender ||
      (
        queryGender
          ? toTitleGender(queryGender)
          : activeFilters["Gender"]?.[0] ||
            "Men"
      );

    localStorage.setItem(
      "preferred_gender",
      nextGender,
    );

    localStorage.setItem(
      "preferred_gender_url",
      `/${nextGender.toLowerCase()}`,
    );

    setActiveFilters((previous) => {
      const next: Record<
        string,
        string[]
      > = {
        ...previous,
        Gender: [nextGender],
      };

      if (matchedCategory) {
        next.Category = [
          String(matchedCategory.id),
        ];
      } else {
        delete next.Category;
      }

      return next;
    });
  }, [categories, searchParams]);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeFilters, sortBy]);

  useEffect(() => {
    if (
      isMobileFilterOpen ||
      isMobileSortOpen
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "auto";
    }

    return () => {
      document.body.style.overflow =
        "auto";
    };
  }, [
    isMobileFilterOpen,
    isMobileSortOpen,
  ]);

  const selectedGender =
    activeFilters["Gender"]?.[0] ||
    "Men";

  const filterConfig = useMemo(() => {
    const genderProducts =
      products.filter(
        (product: any) =>
          getProductGender(product) ===
          normalizeText(selectedGender),
      );

    const genderCategories =
      getCategoriesForGender(
        categories,
        selectedGender,
      );

    const categoryOptions =
      genderCategories.map(
        (category) => ({
          label: getCategoryLabel(
            category,
            selectedGender,
          ),
          value: String(category.id),
          isLevel1:
            Number(
              category.level || 0,
            ) === 1,
        }),
      );

    const brandOptions =
      Array.from(
        new Set(
          genderProducts
            .map(
              (product: any) =>
                product.brand ||
                product.brand_name ||
                "",
            )
            .filter(Boolean),
        ),
      );

    const colorOptions =
      Array.from(
        new Set(
          genderProducts
            .flatMap(
              (product: any) => [
                getProductSelectedColor(
                  product,
                ),
                ...(product.colors || []),
                ...(product.colours || []),
              ],
            )
            .filter(Boolean),
        ),
      );

    const sizeOptions =
      Array.from(
        new Set(
          genderProducts
            .flatMap(
              (product: any) =>
                product.sizes || [],
            )
            .filter(Boolean),
        ),
      );

    return {
      Category: categoryOptions,
      Sizes: sizeOptions.length
        ? sizeOptions
        : [
            "S",
            "M",
            "L",
            "XL",
            "2XL",
            "3XL",
            "4XL",
            "5XL",
            "6XL",
          ],
      Brand: brandOptions.length
        ? brandOptions
        : ["Vandhana"],
      Color: colorOptions.length
        ? colorOptions
        : [
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
  }, [
    categories,
    products,
    selectedGender,
  ]);

  const toggleFilter = (
    category: string,
    value: string,
  ) => {
    setActiveFilters((previous) => {
      if (category === "Gender") {
        localStorage.setItem(
          "preferred_gender",
          value,
        );

        localStorage.setItem(
          "preferred_gender_url",
          `/${value.toLowerCase()}`,
        );

        return {
          Gender: [value],
        };
      }

      const current =
        previous[category] || [];

      if (current.includes(value)) {
        const nextValues =
          current.filter(
            (item) => item !== value,
          );

        const next = {
          ...previous,
        };

        if (nextValues.length) {
          next[category] = nextValues;
        } else {
          delete next[category];
        }

        return next;
      }

      return {
        ...previous,
        [category]: [
          ...current,
          value,
        ],
      };
    });
  };

  const clearAllFilters = () => {
    const gender =
      activeFilters["Gender"]?.[0] ||
      localStorage.getItem(
        "preferred_gender",
      ) ||
      "Men";

    setActiveFilters({
      Gender: [gender],
    });
  };

  const filterCount =
    Object.values(
      activeFilters,
    ).reduce(
      (total, values) =>
        total + values.length,
      0,
    );

  const toggleExpanded = (
    category: string,
  ) => {
    setExpandedFilters(
      (previous) => ({
        ...previous,
        [category]:
          !previous[category],
      }),
    );
  };

  const filteredProducts =
    useMemo(() => {
      let result = [...products];

      if (
        activeFilters["Gender"]?.length
      ) {
        const activeGenders =
          activeFilters["Gender"].map(
            (gender) =>
              normalizeText(gender),
          );

        result = result.filter(
          (product: any) =>
            activeGenders.includes(
              getProductGender(product),
            ),
        );
      }

      if (
        activeFilters["Category"]
          ?.length
      ) {
        const selectedCategoryIds =
          activeFilters["Category"];

        const selectedCategories =
          categories.filter(
            (category) =>
              selectedCategoryIds.includes(
                String(category.id),
              ),
          );

        if (selectedCategories.length) {
          result = result.filter(
            (product) =>
              selectedCategories.some(
                (category) =>
                  productMatchesCategory(
                    product,
                    category,
                    categories,
                  ),
              ),
          );
        }
      }

      if (
        activeFilters["Sizes"]?.length
      ) {
        result = result.filter(
          (product: any) =>
            (product.sizes || []).some(
              (size: string) =>
                activeFilters[
                  "Sizes"
                ].includes(size),
            ),
        );
      }

      if (
        activeFilters["Color"]?.length
      ) {
        result = result.filter(
          (product: any) => {
            const selectedColor =
              normalizeText(
                getProductSelectedColor(
                  product,
                ),
              );

            const activeColors =
              activeFilters["Color"].map(
                normalizeText,
              );

            if (
              selectedColor &&
              activeColors.includes(
                selectedColor,
              )
            ) {
              return true;
            }

            return (
              product.colors ||
              product.colours ||
              []
            ).some((color: string) =>
              activeColors.includes(
                normalizeText(color),
              ),
            );
          },
        );
      }

      if (
        activeFilters["Brand"]?.length
      ) {
        result = result.filter(
          (product: any) =>
            activeFilters[
              "Brand"
            ].includes(
              product.brand ||
                product.brand_name ||
                "",
            ),
        );
      }

      if (
        activeFilters["Discount"]
          ?.length
      ) {
        const required =
          activeFilters[
            "Discount"
          ].map((item) => {
            const match =
              item.match(/\d+/);

            return match
              ? Number(match[0])
              : 0;
          });

        const minimumRequired =
          Math.min(...required);

        result = result.filter(
          (product) =>
            getDiscountPercent(
              product,
            ) >= minimumRequired,
        );
      }

      switch (sortBy) {
        case "Price : High to Low":
          result.sort(
            (a: any, b: any) =>
              Number(b.price || 0) -
              Number(a.price || 0),
          );
          break;

        case "Price : Low to High":
          result.sort(
            (a: any, b: any) =>
              Number(a.price || 0) -
              Number(b.price || 0),
          );
          break;

        case "New Arrival":
          result.sort(
            (a: any, b: any) =>
              new Date(
                b.createdAt ||
                  b.created_at ||
                  0,
              ).getTime() -
              new Date(
                a.createdAt ||
                  a.created_at ||
                  0,
              ).getTime(),
          );
          break;

        case "Popularity":
        default:
          break;
      }

      return dedupeCollectionProducts(
        result,
      );
    }, [
      activeFilters,
      sortBy,
      products,
      categories,
    ]);

  useEffect(() => {
    const currentTarget =
      observerTarget.current;

    if (!currentTarget) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            visibleCount <
              filteredProducts.length
          ) {
            setIsLoadingMore(true);

            setTimeout(() => {
              setVisibleCount(
                (previous) =>
                  previous + 12,
              );

              setIsLoadingMore(false);
            }, 350);
          }
        },
        {
          threshold: 0.1,
          rootMargin: "100px",
        },
      );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(
        currentTarget,
      );
    };
  }, [
    visibleCount,
    filteredProducts.length,
  ]);

  const getHeaderTitle = () => {
    const selectedCategoryIds =
      activeFilters["Category"] ||
      [];

    if (
      selectedCategoryIds.length !== 1
    ) {
      return `${selectedGender} Products`;
    }

    const category =
      categories.find(
        (item) =>
          String(item.id) ===
          String(
            selectedCategoryIds[0],
          ),
      );

    return category
      ? `${selectedGender} ${category.name}`
      : `${selectedGender} Products`;
  };

  const FilterCheckboxes = ({
    categoryKey,
    options,
  }: {
    categoryKey: string;
    options: any[];
  }) => {
    const finalOptions =
      categoryKey === "Gender"
        ? ["Men", "Women", "Kids"]
        : options;

    return (
      <div className="flex flex-col gap-3 mt-3 px-1">
        {finalOptions.map(
          (
            optionObject: any,
            index: number,
          ) => {
            const isObject =
              typeof optionObject ===
                "object" &&
              optionObject !== null;

            const optionValue = isObject
              ? optionObject.value
              : optionObject.toString();

            const optionLabel = isObject
              ? optionObject.label
              : optionObject.toString();

            const isLevel1 = isObject
              ? optionObject.isLevel1
              : false;

            const isSelected =
              activeFilters[
                categoryKey
              ]?.includes(optionValue);

            return (
              <label
                key={`${optionValue}-${index}`}
                className={`flex items-center capitalize justify-between cursor-pointer group ${
                  isObject && !isLevel1
                    ? "ml-5"
                    : ""
                } ${
                  isObject && isLevel1
                    ? "mt-3 mb-1"
                    : ""
                }`}
                onClick={() =>
                  toggleFilter(
                    categoryKey,
                    optionValue,
                  )
                }
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
                      isSelected
                        ? "text-gray-900 font-bold"
                        : "text-gray-500"
                    } ${
                      isLevel1
                        ? "font-bold text-gray-800"
                        : ""
                    }`}
                  >
                    {categoryKey ===
                    "Ratings" ? (
                      <div className="flex items-center gap-1">
                        {[
                          ...Array(
                            5 -
                              optionValue,
                          ),
                        ].map(
                          (_, starIndex) => (
                            <FaStar
                              key={
                                starIndex
                              }
                              className="text-[#f5b82e]"
                              size={12}
                            />
                          ),
                        )}

                        <span className="ml-1 text-xs opacity-70">
                          &amp; up
                        </span>
                      </div>
                    ) : (
                      optionLabel
                    )}
                  </span>
                </div>
              </label>
            );
          },
        )}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen font-montserrat">
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight capitalize">
              {getHeaderTitle()}
            </h1>

            <span className="text-gray-500 text-sm hidden md:inline">
              {filteredProducts.length}{" "}
              Products
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">
              Sort by :
            </span>

            <div className="relative group">
              <button className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900">
                {sortBy}
                <FiChevronDown />
              </button>

              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                {SORT_OPTIONS.map(
                  (option) => (
                    <div
                      key={option}
                      onClick={() =>
                        setSortBy(option)
                      }
                      className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer font-medium"
                    >
                      {option}
                    </div>
                  ),
                )}
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
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">
                Filters

                {filterCount > 0 && (
                  <span className="text-black text-base ml-1">
                    (
                    {Math.max(
                      filterCount - 1,
                      0,
                    )}
                    )
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
              {Object.entries({
                Gender: [
                  "Men",
                  "Women",
                  "Kids",
                ],
                ...filterConfig,
              }).map(
                ([key, options]) => (
                  <div
                    key={key}
                    className="border-b border-gray-50 pb-4"
                  >
                    <button
                      onClick={() =>
                        toggleExpanded(
                          key,
                        )
                      }
                      className="flex w-full items-center justify-between cursor-pointer"
                    >
                      <span className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                        {key}
                      </span>

                      {expandedFilters[
                        key
                      ] ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </button>

                    {expandedFilters[
                      key
                    ] && (
                      <div
                        className="mt-4 pr-2"
                        style={{
                          scrollbarWidth:
                            "thin",
                        }}
                      >
                        <FilterCheckboxes
                          categoryKey={
                            key
                          }
                          options={
                            options as any[]
                          }
                        />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </aside>

          <div className="flex-1 w-full">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <div
                    key={`loading-${index}`}
                    className="min-w-0"
                  >
                    <ProductCardSkeleton />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length >
              0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts
                    .slice(
                      0,
                      visibleCount,
                    )
                    .map(
                      (product: any) => (
                        <ProductCard
                          key={getProductCardKey(
                            product,
                          )}
                          {...product}
                        />
                      ),
                    )}

                  {isLoadingMore &&
                    visibleCount <
                      filteredProducts.length &&
                    Array.from({
                      length: 4,
                    }).map(
                      (_, index) => (
                        <div
                          key={`col-skeleton-${index}`}
                          className="min-w-0"
                        >
                          <ProductCardSkeleton />
                        </div>
                      ),
                    )}
                </div>

                {visibleCount <
                  filteredProducts.length && (
                  <div
                    ref={observerTarget}
                    className="w-full h-4 flex items-center justify-center mt-2"
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FiFilter
                  size={48}
                  className="text-gray-300 mb-4"
                />

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>

                <p className="text-gray-500 mb-6">
                  Try adjusting your
                  filters to find what
                  you're looking for.
                </p>

                <button
                  onClick={
                    clearAllFilters
                  }
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
          onClick={() =>
            setIsMobileSortOpen(true)
          }
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <BiSortAlt2 size={20} />
          Sort

          {sortBy !==
            "Popularity" && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() =>
            setIsMobileFilterOpen(
              true,
            )
          }
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <FiFilter size={18} />
          Filter

          {filterCount > 0 && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
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
                onClick={() =>
                  setIsMobileSortOpen(
                    false,
                  )
                }
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {SORT_OPTIONS.map(
                (option) => (
                  <label
                    key={option}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <span
                      className={`text-[17px] ${
                        sortBy === option
                          ? "font-bold text-black"
                          : "text-gray-600 font-medium"
                      }`}
                    >
                      {option}
                    </span>

                    <div
                      className={`w-5 h-5 rounded-full border-[1.5px] p-[3px] flex items-center justify-center transition-colors ${
                        sortBy === option
                          ? "border-primary"
                          : "border-gray-400 group-hover:border-gray-500"
                      }`}
                    >
                      {sortBy ===
                        option && (
                        <div className="w-full h-full bg-primary rounded-full" />
                      )}
                    </div>
                  </label>
                ),
              )}
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
            Filters{" "}
            {filterCount > 0
              ? `(${filterCount})`
              : ""}
          </h3>

          <button
            onClick={() =>
              setIsMobileFilterOpen(
                false,
              )
            }
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-[#f9f9f9]">
          <div
            className="w-1/3 border-r border-gray-200 overflow-y-auto"
            style={{
              scrollbarWidth: "none",
            }}
          >
            {Object.keys({
              Gender: [
                "Men",
                "Women",
                "Kids",
              ],
              ...filterConfig,
            }).map((key) => {
              const isActive =
                mobileActiveTab === key;

              const activeCount =
                activeFilters[key]
                  ?.length || 0;

              return (
                <button
                  key={key}
                  onClick={() =>
                    setMobileActiveTab(
                      key,
                    )
                  }
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
                    <span className="ml-1 text-primary">
                      ({activeCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-2/3 bg-white p-4 overflow-y-auto">
            <FilterCheckboxes
              categoryKey={
                mobileActiveTab
              }
              options={
                (
                  mobileActiveTab ===
                  "Gender"
                    ? [
                        "Men",
                        "Women",
                        "Kids",
                      ]
                    : (
                        filterConfig as any
                      )[
                        mobileActiveTab
                      ]
                ) || []
              }
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
            onClick={() =>
              setIsMobileFilterOpen(
                false,
              )
            }
            className="flex-1 py-3.5 bg-primary border-2 border-primary text-black font-bold uppercase tracking-wider text-sm rounded-md"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}