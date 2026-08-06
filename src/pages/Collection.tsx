import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "react-router";
import {
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiX,
} from "react-icons/fi";
import {
  FaStar,
} from "react-icons/fa";
import {
  BiSortAlt2,
} from "react-icons/bi";
import {
  ProductCard,
  ProductCardSkeleton,
} from "../components/ProductCard";
import type {
  Product,
  ProductGender,
} from "../Models/Product";
import { resolveColorStyle } from "../utils/colorHexMap";
import {
  fetchCategoriesTree,
  fetchProductsByGender,
  flattenCategoryTree,
  type StorefrontCategory,
} from "../services/productsApi";

const norm = (
  value: unknown,
) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

const uniqueValues = (
  values: any[],
) =>
  Array.from(
    new Map(
      values
        .map((value) =>
          String(
            value ?? "",
          ).trim(),
        )
        .filter(Boolean)
        .map((value) => [
          value.toLowerCase(),
          value,
        ]),
    ).values(),
  );

const genderValue = (
  value: unknown,
): ProductGender => {
  const gender = norm(value);

  if (gender === "women") {
    return "Women";
  }

  if (
    gender === "kids" ||
    gender === "kid"
  ) {
    return "Kids";
  }

  return "Men";
};

const categoryId = (
  category: StorefrontCategory,
) =>
  String(
    category.id ?? "",
  ).trim();

const parentId = (
  category: StorefrontCategory,
) =>
  String(
    category.parentId ??
      category.parent_id ??
      "",
  ).trim();

const categoryPath = (
  category: StorefrontCategory,
) =>
  String(
    category.categoryPath ??
      category.category_path ??
      category.name ??
      "",
  ).trim();

const productGender = (
  product: Product,
) =>
  norm(
    (product as any).gender ??
      (product as any).category ??
      "",
  );

const productColor = (
  product: Product,
) =>
  String(
    (product as any).selectedColor ??
      (product as any)
        .selected_color ??
      (product as any)
        .selectedColour ??
      (product as any)
        .selected_colour ??
      (product as any).colour ??
      (product as any).color ??
      "",
  ).trim();

const productDesignCode = (
  product: Product,
) =>
  String(
    (product as any).designCode ??
      (product as any).design_code ??
      "",
  ).trim();

const productPatternType = (
  product: Product,
) =>
  String(
    (product as any).patternType ??
      (product as any).pattern_type ??
      "",
  ).trim();

const dedupeByDesign = (
  products: Product[],
) => {
  const seen = new Set<string>();

  return products.filter((product) => {
    const designCode = norm(
      productDesignCode(product),
    );

    const productId = norm(
      (product as any).productId ??
        (product as any).product_id ??
        product.id ??
        "",
    );

    const key = designCode
      ? `design|${designCode}`
      : productId
        ? `product|${productId}`
        : `fallback|${norm(
            (product as any).title ??
              (product as any).product_name ??
              (product as any).name ??
              "",
          )}|${norm(
            (product as any).brand ??
              (product as any).brand_name ??
              "",
          )}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const productCategoryIds = (
  product: Product,
) => {
  const ids =
    new Set<string>();

  const add = (value: any) => {
    const id = String(
      value ?? "",
    ).trim();

    if (id) {
      ids.add(id);
    }
  };

  add(
    (product as any).categoryId ??
      (product as any).category_id,
  );

  const variants =
    Array.isArray(
      (product as any).variants,
    )
      ? (product as any).variants
      : [];

  variants.forEach(
    (variant: any) =>
      add(
        variant.categoryId ??
          variant.category_id,
      ),
  );

  return ids;
};

const categoryLabel = (
  category: StorefrontCategory,
  gender: ProductGender,
) => {
  const parts =
    categoryPath(category)
      .split(">")
      .map((part) =>
        part.trim(),
      )
      .filter(Boolean);

  if (
    parts.length &&
    norm(parts[0]) === norm(gender)
  ) {
    parts.shift();
  }

  return (
    parts.join(" > ") ||
    category.name
  );
};

const categoryFromParams = (
  categories:
    StorefrontCategory[],
  params: URLSearchParams,
) => {
  const id =
    params.get("category_id") ||
    params.get("categoryId") ||
    "";

  const slug = norm(
    params.get("category_slug") ||
      params.get("categorySlug") ||
      "",
  );

  const name = norm(
    params.get("category") ||
      "",
  );

  if (id) {
    return (
      categories.find(
        (category) =>
          categoryId(category) ===
          id,
      ) || null
    );
  }

  if (name) {
    const pathMatches =
      categories.filter(
        (category) =>
          norm(
            categoryPath(category),
          ) === name,
      );

    if (
      pathMatches.length === 1
    ) {
      return pathMatches[0];
    }

    const nameMatches =
      categories.filter(
        (category) =>
          norm(category.name) ===
          name,
      );

    if (
      nameMatches.length === 1
    ) {
      return nameMatches[0];
    }
  }

  if (slug) {
    const slugMatches =
      categories.filter(
        (category) =>
          norm(category.slug) ===
          slug,
      );

    if (
      slugMatches.length === 1
    ) {
      return slugMatches[0];
    }
  }

  return null;
};

const categoryGender = (
  category:
    StorefrontCategory | null,
): ProductGender | "" => {
  const gender = String(
    category?.gender ?? "",
  ).toUpperCase();

  if (gender === "WOMEN") {
    return "Women";
  }

  if (gender === "KIDS") {
    return "Kids";
  }

  if (gender === "MEN") {
    return "Men";
  }

  return "";
};

const descendants = (
  categories:
    StorefrontCategory[],
  id: string,
) => {
  const ids =
    new Set<string>(
      id ? [id] : [],
    );

  let changed = true;

  while (changed) {
    changed = false;

    categories.forEach(
      (category) => {
        const child =
          categoryId(category);

        const parent =
          parentId(category);

        if (
          child &&
          parent &&
          ids.has(parent) &&
          !ids.has(child)
        ) {
          ids.add(child);
          changed = true;
        }
      },
    );
  }

  return ids;
};

const ancestors = (
  categories:
    StorefrontCategory[],
  id: string,
) => {
  const map = new Map(
    categories.map(
      (category) => [
        categoryId(category),
        category,
      ],
    ),
  );

  const ids =
    new Set<string>();

  let current = id;

  while (current) {
    const category =
      map.get(current);

    if (!category) {
      break;
    }

    const parent =
      parentId(category);

    if (
      !parent ||
      ids.has(parent)
    ) {
      break;
    }

    ids.add(parent);
    current = parent;
  }

  return ids;
};

const allowedCategoryIds = (
  categories:
    StorefrontCategory[],
  id: string,
) =>
  categories.some(
    (category) =>
      parentId(category) === id,
  )
    ? descendants(
        categories,
        id,
      )
    : new Set([id]);

const matchesCategories = (
  product: Product,
  selected: string[],
  categories:
    StorefrontCategory[],
) =>
  !selected.length ||
  selected.some((id) =>
    Array.from(
      productCategoryIds(product),
    ).some((productId) =>
      allowedCategoryIds(
        categories,
        id,
      ).has(productId),
    ),
  );

const categoriesForGender = (
  categories:
    StorefrontCategory[],
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
        category.gender ===
          target &&
        category.is_active !==
          false &&
        Number(
          category.level || 0,
        ) > 0,
    )
    .sort((first, second) =>
      categoryPath(
        first,
      ).localeCompare(
        categoryPath(second),
        undefined,
        {
          numeric: true,
        },
      ),
    );
};

const productIdentity = (
  product: Product,
) => {
  const designCode = norm(
    productDesignCode(product),
  );

  if (designCode) {
    return `design|${designCode}`;
  }

  const route = String(
    (product as any).routeKey ??
      (product as any).route_key ??
      (product as any).designKey ??
      (product as any).design_key ??
      "",
  ).trim();

  if (route) {
    return `route|${norm(route)}`;
  }

  const productId = norm(
    (product as any).productId ??
      (product as any).product_id ??
      product.id ??
      "",
  );

  if (productId) {
    return `product|${productId}`;
  }

  return [
    "details",
    productGender(product),
    norm(
      (product as any).categoryId ??
        (product as any).category_id ??
        "",
    ),
    norm(
      (product as any).brand ??
        (product as any).brand_name ??
        "",
    ),
    norm(
      (product as any).title ??
        (product as any).product_name ??
        (product as any).name ??
        "",
    ),
  ].join("|");
};

const initialGender = (
  params: URLSearchParams,
) =>
  genderValue(
    params.get("gender") ||
      localStorage.getItem(
        "preferred_gender",
      ) ||
      "Men",
  );

const discountPercent = (
  product: Product,
) => {
  const original = Number(
    (product as any).originalPrice ??
      (product as any)
        .original_price ??
      (product as any).mrp ??
      product.price ??
      0,
  );

  const price = Number(
    product.price || 0,
  );

  return original > price
    ? Math.round(
        ((original - price) /
          original) *
          100,
      )
    : 0;
};

type SortOption =
  | "Popularity"
  | "New Arrival"
  | "Price : High to Low"
  | "Price : Low to High";

const SORT_OPTIONS:
  SortOption[] = [
  "Popularity",
  "New Arrival",
  "Price : High to Low",
  "Price : Low to High",
];

export default function Collection() {
  const [searchParams] =
    useSearchParams();

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<
    StorefrontCategory[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filters,
    setFilters,
  ] = useState<
    Record<string, string[]>
  >(() => ({
    Gender: [
      initialGender(
        searchParams,
      ),
    ],
  }));

  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortOption>(
      "Popularity",
    );

  const [
    expanded,
    setExpanded,
  ] = useState<
    Record<string, boolean>
  >({
    Gender: true,
    Category: true,
    Sizes: true,
    "Pattern Type": true,
  });

  const [
    mobileFilter,
    setMobileFilter,
  ] = useState(false);

  const [
    mobileSort,
    setMobileSort,
  ] = useState(false);

  const [
    mobileTab,
    setMobileTab,
  ] = useState("Sizes");

  const selectedGender =
    genderValue(
      filters.Gender?.[0] ||
        "Men",
    );

  useEffect(() => {
    let active = true;

    fetchCategoriesTree()
      .then((tree) => {
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
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason?.message ||
              "Unable to load categories",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    fetchProductsByGender(
      selectedGender,
      3,
    )
      .then((data) => {
        if (active) {
          setProducts(
            dedupeByDesign(
              Array.isArray(data)
                ? data
                : [],
            ),
          );
        }
      })
      .catch((reason) => {
        if (active) {
          setProducts([]);

          setError(
            reason?.message ||
              "Unable to load products",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedGender]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    const matched =
      categoryFromParams(
        categories,
        searchParams,
      );

    const nextGender =
      categoryGender(matched) ||
      genderValue(
        searchParams.get(
          "gender",
        ) ||
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

    setFilters((previous) => {
      const next: Record<
        string,
        string[]
      > = {
        ...previous,
        Gender: [nextGender],
      };

      if (matched) {
        next.Category = [
          categoryId(matched),
        ];
      } else {
        delete next.Category;
      }

      return next;
    });
  }, [
    categories,
    searchParams,
  ]);

  useEffect(() => {
    document.body.style.overflow =
      mobileFilter ||
      mobileSort
        ? "hidden"
        : "auto";

    return () => {
      document.body.style.overflow =
        "auto";
    };
  }, [
    mobileFilter,
    mobileSort,
  ]);

  const genderProducts =
    useMemo(
      () =>
        dedupeByDesign(
          products.filter(
            (product) =>
              productGender(product) ===
              norm(selectedGender),
          ),
        ),
      [
        products,
        selectedGender,
      ],
    );

  const config = useMemo(() => {
    const categoryOptions =
      categoriesForGender(
        categories,
        selectedGender,
      ).map((category) => ({
        label: categoryLabel(
          category,
          selectedGender,
        ),
        value:
          categoryId(category),
        levelOne:
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

    const brands =
      uniqueValues(
        genderProducts.map(
          (product) =>
            (product as any).brand ??
            (product as any)
              .brand_name,
        ),
      );

    const colors =
      uniqueValues(
        genderProducts.flatMap(
          (product) => [
            productColor(product),
            ...((product as any)
              .colors || []),
            ...((product as any)
              .colours || []),
          ],
        ),
      );

    const sizes =
      uniqueValues(
        genderProducts.flatMap(
          (product) =>
            (product as any).sizes ||
            [],
        ),
      );

    const patternTypes =
      uniqueValues(
        genderProducts.map(
          productPatternType,
        ),
      );

    return {
      Category:
        categoryOptions,
      "Pattern Type":
        patternTypes,
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
  }, [
    categories,
    genderProducts,
    selectedGender,
  ]);

  const toggle = (
    name: string,
    value: string,
  ) => {
    setFilters((previous) => {
      if (name === "Gender") {
        const gender =
          genderValue(value);

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
        previous[name] || [];

      if (name === "Category") {
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

        const children =
          descendants(
            categories,
            value,
          );

        const parents =
          ancestors(
            categories,
            value,
          );

        return {
          ...previous,
          Category: [
            ...current.filter(
              (item) =>
                !children.has(
                  item,
                ) &&
                !parents.has(item),
            ),
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
          next[name] =
            remaining;
        } else {
          delete next[name];
        }

        return next;
      }

      return {
        ...previous,
        [name]: [
          ...current,
          value,
        ],
      };
    });
  };

  const clear = () =>
    setFilters({
      Gender: [
        selectedGender,
      ],
    });

  const filterCount =
    Object.entries(
      filters,
    ).reduce(
      (
        count,
        [name, values],
      ) =>
        name === "Gender"
          ? count
          : count +
            values.length,
      0,
    );

  const visibleProducts =
    useMemo(() => {
      let result =
        genderProducts.filter(
          (product) =>
            matchesCategories(
              product,
              filters.Category ||
                [],
              categories,
            ),
        );

      if (
        filters["Pattern Type"]?.length
      ) {
        const selectedPatternTypes =
          filters["Pattern Type"].map(
            norm,
          );

        result = result.filter(
          (product) =>
            selectedPatternTypes.includes(
              norm(
                productPatternType(
                  product,
                ),
              ),
            ),
        );
      }

      if (
        filters.Sizes?.length
      ) {
        result = result.filter(
          (product) =>
            (
              (product as any)
                .sizes || []
            ).some(
              (size: string) =>
                filters.Sizes.includes(
                  String(size),
                ),
            ),
        );
      }

      if (
        filters.Color?.length
      ) {
        const selected =
          filters.Color.map(norm);

        result = result.filter(
          (product) =>
            [
              productColor(
                product,
              ),
              ...((product as any)
                .colors || []),
              ...((product as any)
                .colours || []),
            ]
              .map(norm)
              .some((color) =>
                selected.includes(
                  color,
                ),
              ),
        );
      }

      if (
        filters.Brand?.length
      ) {
        result = result.filter(
          (product) =>
            filters.Brand.includes(
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
        filters.Discount?.length
      ) {
        const minimum =
          Math.min(
            ...filters.Discount.map(
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
            discountPercent(
              product,
            ) >= minimum,
        );
      }

      if (
        filters.Ratings?.length
      ) {
        const minimum =
          Math.min(
            ...filters.Ratings.map(
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

      const sorted = [...result];

      if (
        sortBy ===
        "Price : High to Low"
      ) {
        sorted.sort(
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
        sorted.sort(
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
        sorted.sort(
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

      return dedupeByDesign(sorted);
    }, [
      filters,
      categories,
      genderProducts,
      sortBy,
    ]);

  const selectedNames = (
    filters.Category || []
  )
    .map((id) =>
      categories.find(
        (category) =>
          categoryId(category) ===
          id,
      ),
    )
    .filter(
      (
        category,
      ): category is StorefrontCategory =>
        Boolean(category),
    )
    .map((category) =>
      categoryLabel(
        category,
        selectedGender,
      ),
    );

  const title =
    selectedNames.length
      ? selectedNames.join(" + ")
      : `${selectedGender} Products`;

  const groups = {
    Gender: [
      "Men",
      "Women",
      "Kids",
    ],
    ...config,
  };

  const Options = ({
    name,
    options,
  }: {
    name: string;
    options: any[];
  }) => (
    <div className="flex flex-col gap-3 mt-3 px-1">
      {(name === "Gender"
        ? [
            "Men",
            "Women",
            "Kids",
          ]
        : options
      ).map(
        (option, index) => {
          const object =
            typeof option ===
              "object" &&
            option !== null;

          const value = object
            ? String(
                option.value,
              )
            : String(option);

          const label = object
            ? String(
                option.label,
              )
            : String(option);

          const selected =
            filters[name]?.includes(
              value,
            ) || false;

          const depth = object
            ? Number(
                option.depth || 0,
              )
            : 0;

          return (
            <button
              type="button"
              key={`${name}-${value}-${index}`}
              onClick={() =>
                toggle(name, value)
              }
              className={`flex items-center justify-between text-left cursor-pointer group ${
                object &&
                option.levelOne
                  ? "mt-3 mb-1"
                  : ""
              }`}
              style={
                object
                  ? {
                      paddingLeft: `${depth * 12}px`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-sm flex items-center justify-center border ${
                    selected
                      ? "bg-primary border-primary"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selected ? (
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 12 10"
                      fill="none"
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

                {name === "Color" ? (
                  <span
                    className="h-4 w-4 rounded-full border border-black/15 shadow-sm"
                    style={{ background: resolveColorStyle(value) }}
                    title={label}
                  />
                ) : null}

                <span
                  className={`text-sm tracking-wide capitalize ${
                    selected
                      ? "text-gray-900 font-bold"
                      : "text-gray-500"
                  } ${
                    object &&
                    option.levelOne
                      ? "font-bold text-gray-800"
                      : ""
                  }`}
                >
                  {name ===
                  "Ratings" ? (
                    <span className="flex items-center gap-1">
                      {Array.from({
                        length:
                          Number(value),
                      }).map(
                        (_, star) => (
                          <FaStar
                            key={star}
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
                    label
                  )}
                </span>
              </div>
            </button>
          );
        },
      )}
    </div>
  );

  return (
    <div className="bg-white min-h-screen font-montserrat pb-16 lg:pb-0">
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight capitalize truncate">
              {title}
            </h1>

            <span className="text-gray-500 text-sm">
              {visibleProducts.length}{" "}
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

              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 shadow-xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible z-40">
                {SORT_OPTIONS.map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() =>
                        setSortBy(option)
                      }
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 font-medium"
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
        {error ? (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
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
                  onClick={clear}
                  className="text-sm text-teal-500 hover:underline font-medium"
                >
                  Clear All
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-6">
              {Object.entries(
                groups,
              ).map(
                ([
                  name,
                  options,
                ]) => (
                  <div
                    key={name}
                    className="border-b border-gray-50 pb-4"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(
                          (current) => ({
                            ...current,
                            [name]:
                              !current[
                                name
                              ],
                          }),
                        )
                      }
                      className="flex w-full items-center justify-between"
                    >
                      <span className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                        {name}
                      </span>

                      {expanded[
                        name
                      ] ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </button>

                    {expanded[
                      name
                    ] ? (
                      <Options
                        name={name}
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
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({
                  length: 8,
                }).map(
                  (_, index) => (
                    <div key={index}>
                      <ProductCardSkeleton />
                    </div>
                  ),
                )}
              </div>
            ) : visibleProducts.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {visibleProducts.map(
                  (product) => (
                    <ProductCard
                      key={productIdentity(
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
                  onClick={clear}
                  className="px-10 py-4 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm"
                >
                  Clear all
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 grid grid-cols-2 divide-x py-3">
        <button
          type="button"
          onClick={() =>
            setMobileSort(true)
          }
          className="flex items-center justify-center gap-2 font-bold uppercase text-sm"
        >
          <BiSortAlt2 size={20} />
          Sort
        </button>

        <button
          type="button"
          onClick={() =>
            setMobileFilter(true)
          }
          className="flex items-center justify-center gap-2 font-bold uppercase text-sm"
        >
          <FiFilter size={18} />
          Filter

          {filterCount ? (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          ) : null}
        </button>
      </div>

      {mobileSort ? (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6">
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-bold">
                Sort by
              </h3>

              <button
                type="button"
                onClick={() =>
                  setMobileSort(false)
                }
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
                      setSortBy(option);
                      setMobileSort(
                        false,
                      );
                    }}
                    className="flex justify-between"
                  >
                    <span
                      className={
                        sortBy === option
                          ? "font-bold"
                          : "text-gray-600"
                      }
                    >
                      {option}
                    </span>

                    <span
                      className={`w-5 h-5 rounded-full border p-[3px] ${
                        sortBy === option
                          ? "border-primary"
                          : "border-gray-400"
                      }`}
                    >
                      {sortBy ===
                      option ? (
                        <span className="block w-full h-full bg-primary rounded-full" />
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
        className={`lg:hidden fixed inset-0 z-50 bg-white flex flex-col transition-all ${
          mobileFilter
            ? "translate-y-0"
            : "translate-y-full pointer-events-none"
        }`}
      >
        <div className="p-4 flex justify-between border-b">
          <h3 className="text-xl font-bold">
            Filters
            {filterCount
              ? ` (${filterCount})`
              : ""}
          </h3>

          <button
            type="button"
            onClick={() =>
              setMobileFilter(false)
            }
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 bg-gray-50 overflow-y-auto">
            {Object.keys(
              groups,
            ).map((name) => (
              <button
                type="button"
                key={name}
                onClick={() =>
                  setMobileTab(name)
                }
                className={`w-full text-left py-4 px-3 text-sm font-bold uppercase ${
                  mobileTab === name
                    ? "bg-white"
                    : "text-gray-500"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="w-2/3 p-4 overflow-y-auto">
            <Options
              name={mobileTab}
              options={
                mobileTab ===
                "Gender"
                  ? [
                      "Men",
                      "Women",
                      "Kids",
                    ]
                  : (config as any)[
                      mobileTab
                    ] || []
              }
            />
          </div>
        </div>

        <div className="p-4 flex gap-3 border-t">
          <button
            type="button"
            onClick={clear}
            className="flex-1 py-3 border-2 border-gray-300 font-bold uppercase"
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileFilter(false)
            }
            className="flex-1 py-3 bg-primary border-2 border-primary font-bold uppercase"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}