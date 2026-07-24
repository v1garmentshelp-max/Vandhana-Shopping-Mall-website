import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiX,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { BiSortAlt2 } from "react-icons/bi";
import {
  ProductCard,
  ProductCardSkeleton,
} from "../components/ProductCard";
import type {
  Product,
  ProductGender,
} from "../Models/Product";
import {
  fetchCategoriesTree,
  fetchProductsByGender,
  flattenCategoryTree,
  type StorefrontCategory,
} from "../services/productsApi";

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleGender = (
  value: unknown,
): ProductGender => {
  const normalized = normalizeText(value);

  if (normalized === "women") {
    return "Women";
  }

  if (
    normalized === "kids" ||
    normalized === "kid"
  ) {
    return "Kids";
  }

  return "Men";
};

const getCategoryId = (
  category: StorefrontCategory,
) =>
  String(category.id ?? "").trim();

const getCategoryParentId = (
  category: StorefrontCategory,
) =>
  String(
    category.parentId ??
      category.parent_id ??
      "",
  ).trim();

const getCategoryPath = (
  category: StorefrontCategory,
) =>
  String(
    category.categoryPath ??
      category.category_path ??
      category.name ??
      "",
  ).trim();

const getProductCategoryId = (
  product: Product,
) =>
  String(
    (product as any).categoryId ??
      (product as any).category_id ??
      "",
  ).trim();

const getProductGender = (
  product: Product,
) =>
  normalizeText(
    (product as any).gender ??
      (product as any).category ??
      "",
  );

const getProductSelectedColor = (
  product: Product,
) =>
  String(
    (product as any).selectedColor ??
      (product as any).selected_color ??
      (product as any).colour ??
      (product as any).color ??
      "",
  ).trim();

const getCategoryLabel = (
  category: StorefrontCategory,
  gender: ProductGender,
) => {
  const parts = getCategoryPath(category)
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    parts.length &&
    normalizeText(parts[0]) ===
      normalizeText(gender)
  ) {
    parts.shift();
  }

  return (
    parts.join(" > ") ||
    category.name
  );
};

const findUniqueCategory = (
  categories: StorefrontCategory[],
  predicate: (
    category: StorefrontCategory,
  ) => boolean,
) => {
  const matches =
    categories.filter(predicate);

  return matches.length === 1
    ? matches[0]
    : null;
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
    searchParams.get("category") || "";

  if (categoryId) {
    const found = categories.find(
      (item) =>
        getCategoryId(item) ===
        String(categoryId),
    );

    if (found) {
      return found;
    }
  }

  if (category) {
    const query =
      normalizeText(category);

    const pathMatch =
      findUniqueCategory(
        categories,
        (item) =>
          normalizeText(
            getCategoryPath(item),
          ) === query,
      );

    if (pathMatch) {
      return pathMatch;
    }

    const nameMatch =
      findUniqueCategory(
        categories,
        (item) =>
          normalizeText(item.name) ===
          query,
      );

    if (nameMatch) {
      return nameMatch;
    }
  }

  if (categorySlug) {
    const query =
      normalizeText(categorySlug);

    const slugMatch =
      findUniqueCategory(
        categories,
        (item) =>
          normalizeText(item.slug) ===
          query,
      );

    if (slugMatch) {
      return slugMatch;
    }
  }

  return null;
};

const getCategoryGender = (
  category: StorefrontCategory | null,
): ProductGender | "" => {
  const gender = String(
    category?.gender ?? "",
  ).toUpperCase();

  if (gender === "MEN") {
    return "Men";
  }

  if (gender === "WOMEN") {
    return "Women";
  }

  if (gender === "KIDS") {
    return "Kids";
  }

  return "";
};

const getDescendantIds = (
  categories: StorefrontCategory[],
  categoryId: string,
) => {
  const ids = new Set<string>();

  const rootId = String(
    categoryId || "",
  ).trim();

  if (!rootId) {
    return ids;
  }

  ids.add(rootId);

  let changed = true;

  while (changed) {
    changed = false;

    categories.forEach((category) => {
      const id =
        getCategoryId(category);

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

const getAncestorIds = (
  categories: StorefrontCategory[],
  categoryId: string,
) => {
  const categoryMap = new Map(
    categories.map((category) => [
      getCategoryId(category),
      category,
    ]),
  );

  const ids = new Set<string>();

  let currentId = String(
    categoryId || "",
  ).trim();

  while (currentId) {
    const category =
      categoryMap.get(currentId);

    if (!category) {
      break;
    }

    const parentId =
      getCategoryParentId(category);

    if (
      !parentId ||
      ids.has(parentId)
    ) {
      break;
    }

    ids.add(parentId);
    currentId = parentId;
  }

  return ids;
};

const productMatchesSelectedCategories = (
  product: Product,
  selectedCategoryIds: string[],
  categories: StorefrontCategory[],
) => {
  if (!selectedCategoryIds.length) {
    return true;
  }

  const productCategoryId =
    getProductCategoryId(product);

  if (!productCategoryId) {
    return false;
  }

  return selectedCategoryIds.some(
    (categoryId) =>
      getDescendantIds(
        categories,
        categoryId,
      ).has(productCategoryId),
  );
};

const getCategoriesForGender = (
  categories: StorefrontCategory[],
  gender: ProductGender,
) => {
  const target =
    gender === "Women"
      ? "WOMEN"
      : gender === "Kids"
        ? "KIDS"
        : "MEN";

  return categories
    .filter(
      (category) =>
        category.gender === target &&
        category.is_active !== false &&
        Number(category.level || 0) > 0,
    )
    .sort((first, second) =>
      getCategoryPath(
        first,
      ).localeCompare(
        getCategoryPath(second),
        undefined,
        {
          numeric: true,
        },
      ),
    );
};

const getProductCardKey = (
  product: Product,
) =>
  [
    (product as any).productId ??
      (product as any).product_id ??
      product.id,
    (product as any).categoryId ??
      (product as any).category_id,
    (product as any).patternCode ??
      (product as any).pattern_code,
    (product as any).selectedColor ??
      (product as any).selected_color ??
      (product as any).colour ??
      (product as any).color,
    (product as any).variantId ??
      (product as any).variant_id,
    (product as any).barcode ??
      (product as any).ean_code,
  ]
    .map((value) =>
      normalizeText(value),
    )
    .filter(Boolean)
    .join("|");

const getProductIdentity = (
  product: Product,
) => {
  const productId = String(
    (product as any).productId ??
      (product as any).product_id ??
      "",
  ).trim();

  const categoryId = String(
    (product as any).categoryId ??
      (product as any).category_id ??
      "",
  ).trim();

  const pattern = normalizeText(
    (product as any).patternCode ??
      (product as any).pattern_code ??
      "",
  );

  const color = normalizeText(
    getProductSelectedColor(product),
  );

  if (productId) {
    return [
      productId,
      categoryId,
      pattern,
      color,
    ].join("|");
  }

  return [
    normalizeText(
      (product as any).gender ??
        (product as any).category,
    ),
    categoryId,
    normalizeText(
      (product as any).brand ??
        (product as any).brand_name,
    ),
    normalizeText(
      (product as any).title ??
        (product as any).product_name ??
        (product as any).name,
    ),
    pattern,
    color,
  ].join("|");
};

const dedupeProducts = (
  products: Product[],
) => {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key =
      getProductIdentity(product);

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
    searchParams.get("gender");

  if (queryGender) {
    return toTitleGender(queryGender);
  }

  return toTitleGender(
    localStorage.getItem(
      "preferred_gender",
    ) || "Men",
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
    (product as any).originalPrice ??
      (product as any).original_price ??
      (product as any).mrp ??
      product.price ??
      0,
  );

  const price = Number(
    product.price || 0,
  );

  if (
    !original ||
    original <= price
  ) {
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
    useState<SortOption>(
      "Popularity",
    );

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

  const selectedGender: ProductGender =
    toTitleGender(
      activeFilters.Gender?.[0] ||
        "Men",
    );

  useEffect(() => {
    let active = true;

    const loadCategories =
      async () => {
        try {
          const tree =
            await fetchCategoriesTree();

          if (active) {
            setCategories(
              flattenCategoryTree(
                tree,
              ).filter(
                (category) =>
                  category.is_active !==
                  false,
              ),
            );
          }
        } catch (error: any) {
          if (active) {
            setProductsError(
              error?.message ||
                "Unable to load categories",
            );
          }
        }
      };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError("");

      try {
        const data =
          await fetchProductsByGender(
            selectedGender,
            3,
          );

        if (active) {
          setProducts(
            Array.isArray(data)
              ? data
              : [],
          );
        }
      } catch (error: any) {
        if (active) {
          setProducts([]);

          setProductsError(
            error?.message ||
              "Unable to load products",
          );
        }
      } finally {
        if (active) {
          setProductsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, [selectedGender]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

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

    const nextGender: ProductGender =
      matchedGender ||
      toTitleGender(
        queryGender ||
          selectedGender,
      );

    localStorage.setItem(
      "preferred_gender",
      nextGender,
    );

    localStorage.setItem(
      "preferred_gender_url",
      `/${nextGender.toLowerCase()}`,
    );

    setActiveFilters(
      (previous) => {
        const next: Record<
          string,
          string[]
        > = {
          ...previous,
          Gender: [nextGender],
        };

        if (matchedCategory) {
          next.Category = [
            getCategoryId(
              matchedCategory,
            ),
          ];
        } else {
          delete next.Category;
        }

        return next;
      },
    );
  }, [categories, searchParams]);

  useEffect(() => {
    document.body.style.overflow =
      isMobileFilterOpen ||
      isMobileSortOpen
        ? "hidden"
        : "auto";

    return () => {
      document.body.style.overflow =
        "auto";
    };
  }, [
    isMobileFilterOpen,
    isMobileSortOpen,
  ]);

  const genderProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          getProductGender(
            product,
          ) ===
          normalizeText(
            selectedGender,
          ),
      ),
    [products, selectedGender],
  );

  const filterConfig = useMemo(
    () => {
      const categoryOptions =
        getCategoriesForGender(
          categories,
          selectedGender,
        ).map((category) => ({
          label: getCategoryLabel(
            category,
            selectedGender,
          ),
          value:
            getCategoryId(category),
          isLevel1:
            Number(
              category.level || 0,
            ) === 1,
          depth: Math.max(
            Number(
              category.level || 0,
            ) - 1,
            0,
          ),
        }));

      const brands = Array.from(
        new Set(
          genderProducts
            .map((product) =>
              String(
                (product as any)
                  .brand ??
                  (product as any)
                    .brand_name ??
                  "",
              ).trim(),
            )
            .filter(Boolean),
        ),
      );

      const colors = Array.from(
        new Set(
          genderProducts
            .flatMap((product) => [
              getProductSelectedColor(
                product,
              ),
              ...((product as any)
                .colors || []),
              ...((product as any)
                .colours || []),
            ])
            .map((value) =>
              String(value).trim(),
            )
            .filter(Boolean),
        ),
      );

      const sizes = Array.from(
        new Set(
          genderProducts
            .flatMap(
              (product) =>
                (product as any)
                  .sizes || [],
            )
            .map((value) =>
              String(value).trim(),
            )
            .filter(Boolean),
        ),
      );

      return {
        Category: categoryOptions,
        Sizes: sizes.length
          ? sizes
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
        Brand: brands.length
          ? brands
          : ["Vandhana"],
        Color: colors.length
          ? colors
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
    },
    [
      categories,
      genderProducts,
      selectedGender,
    ],
  );

  const toggleFilter = (
    filterName: string,
    value: string,
  ) => {
    setActiveFilters(
      (previous) => {
        if (
          filterName === "Gender"
        ) {
          const gender =
            toTitleGender(value);

          localStorage.setItem(
            "preferred_gender",
            gender,
          );

          localStorage.setItem(
            "preferred_gender_url",
            `/${gender.toLowerCase()}`,
          );

          return {
            Gender: [gender],
          };
        }

        const current =
          previous[filterName] || [];

        if (
          filterName === "Category"
        ) {
          if (
            current.includes(value)
          ) {
            const remaining =
              current.filter(
                (item) =>
                  item !== value,
              );

            const next = {
              ...previous,
            };

            if (remaining.length) {
              next.Category =
                remaining;
            } else {
              delete next.Category;
            }

            return next;
          }

          const descendants =
            getDescendantIds(
              categories,
              value,
            );

          const ancestors =
            getAncestorIds(
              categories,
              value,
            );

          const cleaned =
            current.filter(
              (item) =>
                !descendants.has(
                  item,
                ) &&
                !ancestors.has(item),
            );

          return {
            ...previous,
            Category: [
              ...cleaned,
              value,
            ],
          };
        }

        if (
          current.includes(value)
        ) {
          const remaining =
            current.filter(
              (item) =>
                item !== value,
            );

          const next = {
            ...previous,
          };

          if (remaining.length) {
            next[filterName] =
              remaining;
          } else {
            delete next[filterName];
          }

          return next;
        }

        return {
          ...previous,
          [filterName]: [
            ...current,
            value,
          ],
        };
      },
    );
  };

  const clearAllFilters = () => {
    setActiveFilters({
      Gender: [selectedGender],
    });
  };

  const filterCount =
    Object.entries(
      activeFilters,
    ).reduce(
      (
        total,
        [key, values],
      ) =>
        key === "Gender"
          ? total
          : total +
            values.length,
      0,
    );

  const filteredProducts =
    useMemo(() => {
      let result =
        genderProducts.filter(
          (product) =>
            productMatchesSelectedCategories(
              product,
              activeFilters.Category ||
                [],
              categories,
            ),
        );

      if (
        activeFilters.Sizes
          ?.length
      ) {
        result = result.filter(
          (product) =>
            (
              (product as any)
                .sizes || []
            ).some(
              (size: string) =>
                activeFilters.Sizes.includes(
                  String(size),
                ),
            ),
        );
      }

      if (
        activeFilters.Color
          ?.length
      ) {
        const colors =
          activeFilters.Color.map(
            normalizeText,
          );

        result = result.filter(
          (product) => {
            const values = [
              getProductSelectedColor(
                product,
              ),
              ...((product as any)
                .colors || []),
              ...((product as any)
                .colours || []),
            ].map(normalizeText);

            return values.some(
              (value) =>
                colors.includes(
                  value,
                ),
            );
          },
        );
      }

      if (
        activeFilters.Brand
          ?.length
      ) {
        result = result.filter(
          (product) =>
            activeFilters.Brand.includes(
              String(
                (product as any)
                  .brand ??
                  (product as any)
                    .brand_name ??
                  "",
              ),
            ),
        );
      }

      if (
        activeFilters.Discount
          ?.length
      ) {
        const minimum =
          Math.min(
            ...activeFilters.Discount.map(
              (value) =>
                Number(
                  value.match(
                    /\d+/,
                  )?.[0] || 0,
                ),
            ),
          );

        result = result.filter(
          (product) =>
            getDiscountPercent(
              product,
            ) >= minimum,
        );
      }

      if (
        activeFilters.Ratings
          ?.length
      ) {
        const minimum =
          Math.min(
            ...activeFilters.Ratings.map(
              Number,
            ),
          );

        result = result.filter(
          (product) =>
            Number(
              (product as any)
                .ratings
                ?.average || 0,
            ) >= minimum,
        );
      }

      if (
        sortBy ===
        "Price : High to Low"
      ) {
        result.sort(
          (first, second) =>
            Number(
              second.price || 0,
            ) -
            Number(
              first.price || 0,
            ),
        );
      } else if (
        sortBy ===
        "Price : Low to High"
      ) {
        result.sort(
          (first, second) =>
            Number(
              first.price || 0,
            ) -
            Number(
              second.price || 0,
            ),
        );
      } else if (
        sortBy === "New Arrival"
      ) {
        result.sort(
          (first, second) =>
            new Date(
              (second as any)
                .createdAt ||
                (second as any)
                  .created_at ||
                0,
            ).getTime() -
            new Date(
              (first as any)
                .createdAt ||
                (first as any)
                  .created_at ||
                0,
            ).getTime(),
        );
      }

      return dedupeProducts(
        result,
      );
    }, [
      activeFilters,
      categories,
      genderProducts,
      sortBy,
    ]);

  const selectedCategoryNames = (
    activeFilters.Category || []
  )
    .map((id) =>
      categories.find(
        (category) =>
          getCategoryId(
            category,
          ) === id,
      ),
    )
    .filter(
      (
        category,
      ): category is StorefrontCategory =>
        Boolean(category),
    )
    .map((category) =>
      getCategoryLabel(
        category,
        selectedGender,
      ),
    );

  const headerTitle =
    selectedCategoryNames.length
      ? selectedCategoryNames.join(
          " + ",
        )
      : `${selectedGender} Products`;

  const toggleExpanded = (
    key: string,
  ) => {
    setExpandedFilters(
      (previous) => ({
        ...previous,
        [key]: !previous[key],
      }),
    );
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
        ? [
            "Men",
            "Women",
            "Kids",
          ]
        : options;

    return (
      <div className="flex flex-col gap-3 mt-3 px-1">
        {finalOptions.map(
          (
            optionObject,
            index,
          ) => {
            const isObject =
              typeof optionObject ===
                "object" &&
              optionObject !== null;

            const optionValue =
              isObject
                ? String(
                    optionObject.value,
                  )
                : String(
                    optionObject,
                  );

            const optionLabel =
              isObject
                ? String(
                    optionObject.label,
                  )
                : String(
                    optionObject,
                  );

            const isLevel1 =
              isObject
                ? Boolean(
                    optionObject.isLevel1,
                  )
                : false;

            const depth =
              isObject
                ? Number(
                    optionObject.depth ||
                      0,
                  )
                : 0;

            const selected =
              activeFilters[
                categoryKey
              ]?.includes(
                optionValue,
              ) || false;

            return (
              <button
                type="button"
                key={`${categoryKey}-${optionValue}-${index}`}
                className={`flex items-center justify-between text-left cursor-pointer group ${
                  isObject &&
                  isLevel1
                    ? "mt-3 mb-1"
                    : ""
                }`}
                style={
                  isObject
                    ? {
                        paddingLeft: `${depth * 12}px`,
                      }
                    : undefined
                }
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
                      selected
                        ? "bg-primary border-primary text-black"
                        : "border-gray-300 bg-white group-hover:border-gray-400"
                    }`}
                  >
                    {selected ? (
                      <svg
                        className="w-3 h-3"
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
                    ) : null}
                  </div>

                  <span
                    className={`text-sm tracking-wide capitalize ${
                      selected
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
                      <span className="flex items-center gap-1">
                        {Array.from({
                          length:
                            Number(
                              optionValue,
                            ),
                        }).map(
                          (
                            _,
                            starIndex,
                          ) => (
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
                      </span>
                    ) : (
                      optionLabel
                    )}
                  </span>
                </div>
              </button>
            );
          },
        )}
      </div>
    );
  };

  const filterGroups = {
    Gender: [
      "Men",
      "Women",
      "Kids",
    ],
    ...filterConfig,
  };

  return (
    <div className="bg-white min-h-screen font-montserrat pb-16 lg:pb-0">
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight capitalize truncate">
              {headerTitle}
            </h1>

            <span className="text-gray-500 text-sm">
              {
                filteredProducts.length
              }{" "}
              Products
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">
              Sort by :
            </span>

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900"
              >
                {sortBy}
                <FiChevronDown />
              </button>

              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 shadow-xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40">
                {SORT_OPTIONS.map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() =>
                        setSortBy(
                          option,
                        )
                      }
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium"
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        {productsError ? (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {productsError}
          </div>
        ) : null}

        <div className="flex gap-8 items-start">
          <aside
            className="hidden lg:block w-64 shrink-0 sticky top-24 h-[calc(100vh-100px)] overflow-y-auto pr-2"
            style={{
              scrollbarWidth:
                "none",
            }}
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">
                Filters
                {filterCount
                  ? ` (${filterCount})`
                  : ""}
              </h2>

              {filterCount ? (
                <button
                  type="button"
                  onClick={
                    clearAllFilters
                  }
                  className="text-sm text-teal-500 hover:text-teal-700 hover:underline font-medium"
                >
                  Clear All
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-6">
              {Object.entries(
                filterGroups,
              ).map(
                ([
                  key,
                  options,
                ]) => (
                  <div
                    key={key}
                    className="border-b border-gray-50 pb-4"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleExpanded(
                          key,
                        )
                      }
                      className="flex w-full items-center justify-between"
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
                    ] ? (
                      <FilterCheckboxes
                        categoryKey={
                          key
                        }
                        options={
                          options as any[]
                        }
                      />
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </aside>

          <main className="flex-1 w-full min-w-0">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({
                  length: 8,
                }).map(
                  (_, index) => (
                    <div
                      key={`loading-${index}`}
                      className="min-w-0"
                    >
                      <ProductCardSkeleton />
                    </div>
                  ),
                )}
              </div>
            ) : filteredProducts.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map(
                  (product) => (
                    <ProductCard
                      key={getProductCardKey(
                        product,
                      )}
                      {...product}
                    />
                  ),
                )}
              </div>
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
                  you&apos;re looking
                  for.
                </p>

                <button
                  type="button"
                  onClick={
                    clearAllFilters
                  }
                  className="px-10 py-4 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-105 transition-transform"
                >
                  Clear all
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 grid grid-cols-2 divide-x divide-gray-200 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() =>
            setIsMobileSortOpen(
              true,
            )
          }
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <BiSortAlt2 size={20} />
          Sort

          {sortBy !==
          "Popularity" ? (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() =>
            setIsMobileFilterOpen(
              true,
            )
          }
          className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm text-gray-800"
        >
          <FiFilter size={18} />
          Filter

          {filterCount ? (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          ) : null}
        </button>
      </div>

      {isMobileSortOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-white rounded-t-3xl pt-6 pb-8 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                Sort by
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsMobileSortOpen(
                    false,
                  )
                }
                className="p-2 bg-gray-100 rounded-full"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {SORT_OPTIONS.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => {
                      setSortBy(
                        option,
                      );

                      setIsMobileSortOpen(
                        false,
                      );
                    }}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={`text-[17px] ${
                        sortBy ===
                        option
                          ? "font-bold text-black"
                          : "text-gray-600 font-medium"
                      }`}
                    >
                      {option}
                    </span>

                    <span
                      className={`w-5 h-5 rounded-full border-[1.5px] p-[3px] flex items-center justify-center ${
                        sortBy ===
                        option
                          ? "border-primary"
                          : "border-gray-400"
                      }`}
                    >
                      {sortBy ===
                      option ? (
                        <span className="w-full h-full bg-primary rounded-full" />
                      ) : null}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`lg:hidden fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300 ${
          isMobileFilterOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="pt-4 pb-3 px-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <h3 className="text-xl font-bold text-gray-900">
            Filters
            {filterCount
              ? ` (${filterCount})`
              : ""}
          </h3>

          <button
            type="button"
            onClick={() =>
              setIsMobileFilterOpen(
                false,
              )
            }
            className="p-2 bg-gray-100 rounded-full"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-[#f9f9f9]">
          <div
            className="w-1/3 border-r border-gray-200 overflow-y-auto"
            style={{
              scrollbarWidth:
                "none",
            }}
          >
            {Object.keys(
              filterGroups,
            ).map((key) => {
              const activeCount =
                key === "Gender"
                  ? 0
                  : activeFilters[
                      key
                    ]?.length || 0;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() =>
                    setMobileActiveTab(
                      key,
                    )
                  }
                  className={`w-full text-left py-4 px-3 text-[13px] uppercase tracking-wider font-bold relative ${
                    mobileActiveTab ===
                    key
                      ? "bg-white text-black"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {mobileActiveTab ===
                  key ? (
                    <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  ) : null}

                  {key}
                  {activeCount
                    ? ` (${activeCount})`
                    : ""}
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
                mobileActiveTab ===
                "Gender"
                  ? [
                      "Men",
                      "Women",
                      "Kids",
                    ]
                  : (filterConfig as any)[
                      mobileActiveTab
                    ] || []
              }
            />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={
              clearAllFilters
            }
            className="flex-1 py-3.5 border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wider text-sm rounded-md"
          >
            Clear All
          </button>

          <button
            type="button"
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