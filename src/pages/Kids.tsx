import { useEffect, useMemo, useState } from "react";
import HeroCarousel from "../components/HeroCarousel";
import type { Banner } from "../components/HeroCarousel";
import poster1 from "../assets/hero-poster-10.jpeg";
import poster2 from "../assets/hero-poster-11.jpeg";
import poster3 from "../assets/hero-poster-12.jpeg";
import poster4 from "../assets/hero-poster-13.jpeg";
import poster5 from "../assets/hero-poster-14.jpeg";
import type { Product } from "../Models/Product";
import CategoriesSection from "../components/CategoriesSection";
import NamedSection from "../components/NamedSection";
import HeroProductSection from "../components/HeroProductSection";
import FeaturesSection from "../components/FeaturesSection";
import { CollectionTabs } from "../components/CollectionTabs";
import {
  fetchCategoriesByGender,
  fetchProductsByGender,
  type StorefrontCategory,
} from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  {
    id: 5,
    image: poster5,
    alt: "Kids Collection",
    link: "/collections?gender=Kids",
  },
  {
    id: 1,
    image: poster1,
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Kids",
  },
  {
    id: 2,
    image: poster2,
    alt: "Jeans Collection",
    link: "/collections?gender=Kids&category_id=27",
  },
  {
    id: 3,
    image: poster3,
    alt: "Kids Wear",
    link: "/collections?gender=Kids",
  },
  {
    id: 4,
    image: poster4,
    alt: "Kids Fashion",
    link: "/collections?gender=Kids",
  },
];

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCategoryId = (category: any) =>
  String(category?.id || "").trim();

const getCategoryParentId = (category: any) =>
  String(
    category?.parentId ??
      category?.parent_id ??
      "",
  ).trim();

const getProductCategoryId = (product: any) =>
  String(
    product?.categoryId ??
      product?.category_id ??
      "",
  ).trim();

const getCategoryDescendantIds = (
  categories: StorefrontCategory[],
  rootCategoryIds: string[],
) => {
  const ids = new Set(
    rootCategoryIds
      .map(String)
      .map((id) => id.trim())
      .filter(Boolean),
  );

  let changed = true;

  while (changed) {
    changed = false;

    categories.forEach((category) => {
      const id = getCategoryId(category);
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

const byCategoryIds = (
  products: Product[],
  categories: StorefrontCategory[],
  categoryIds: string[],
) => {
  const allowedIds = getCategoryDescendantIds(
    categories,
    categoryIds,
  );

  return products.filter((product: any) =>
    allowedIds.has(getProductCategoryId(product)),
  );
};

const byName = (
  products: Product[],
  words: string[],
) => {
  const searchWords = words
    .map(normalizeText)
    .filter(Boolean);

  return products.filter((product: any) => {
    const text = normalizeText(
      `${product.title || ""} ${product.product_name || ""} ${product.name || ""} ${product.categoryName || ""} ${product.category_name || ""} ${product.categoryPath || ""} ${product.category_path || ""}`,
    );

    return searchWords.some((word) =>
      text.includes(word),
    );
  });
};

const getKidsShopCategories = (
  categories: StorefrontCategory[],
  products: Product[],
) => {
  const categoryMap = new Map(
    categories.map((category) => [
      getCategoryId(category),
      category,
    ]),
  );

  const productCategoryIds = new Set(
    products
      .map((product: any) =>
        getProductCategoryId(product),
      )
      .filter(Boolean),
  );

  return categories
    .filter((category: any) => {
      const categoryId = getCategoryId(category);
      const parentId = getCategoryParentId(category);

      if (
        !categoryId ||
        category?.is_active === false ||
        !["21", "22"].includes(parentId)
      ) {
        return false;
      }

      const descendantIds =
        getCategoryDescendantIds(
          categories,
          [categoryId],
        );

      return Array.from(descendantIds).some(
        (id) => productCategoryIds.has(id),
      );
    })
    .map((category: any) => {
      const parent = categoryMap.get(
        getCategoryParentId(category),
      );

      const parentName = String(
        parent?.name || "",
      ).trim();

      const categoryName = String(
        category?.name || "",
      ).trim();

      const displayName =
        parentName &&
        !normalizeText(categoryName).startsWith(
          normalizeText(parentName),
        )
          ? `${parentName} ${categoryName}`
          : categoryName;

      return {
        ...category,
        name: displayName,
      };
    })
    .sort((first: any, second: any) => {
      const firstParent =
        getCategoryParentId(first);

      const secondParent =
        getCategoryParentId(second);

      if (firstParent !== secondParent) {
        return firstParent === "21" ? -1 : 1;
      }

      const firstOrder = Number(
        first.sort_order || 0,
      );

      const secondOrder = Number(
        second.sort_order || 0,
      );

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(first.name).localeCompare(
        String(second.name),
        undefined,
        { numeric: true },
      );
    });
};

const Kids = () => {
  const [typedProducts, setTypedProducts] =
    useState<Product[]>([]);

  const [pageCategories, setPageCategories] =
    useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem(
      "preferred_gender",
      "Kids",
    );

    localStorage.setItem(
      "preferred_gender_url",
      "/kids",
    );
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, categories] =
          await Promise.all([
            fetchProductsByGender("Kids", 3),
            fetchCategoriesByGender("Kids"),
          ]);

        if (!alive) return;

        setTypedProducts(
          Array.isArray(products)
            ? products
            : [],
        );

        setPageCategories(
          (Array.isArray(categories)
            ? categories
            : []
          ).filter(
            (category: any) =>
              category?.is_active !== false,
          ),
        );
      } catch {
        if (!alive) return;

        setTypedProducts([]);
        setPageCategories([]);
      }
    };

    void loadData();

    return () => {
      alive = false;
    };
  }, []);

  const shopCategories = useMemo(
    () =>
      getKidsShopCategories(
        pageCategories,
        typedProducts,
      ),
    [pageCategories, typedProducts],
  );

  const newDrops = useMemo(
    () => typedProducts,
    [typedProducts],
  );

  const nightDresses = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["24", "36"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "night dress",
        ]);
  }, [typedProducts, pageCategories]);

  const pants = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      [
        "25",
        "26",
        "27",
        "28",
        "29",
        "35",
        "37",
        "38",
      ],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "pant",
          "bagge",
          "baggy",
          "jean",
          "cargo",
          "jogger",
          "short",
        ]);
  }, [typedProducts, pageCategories]);

  const frocks = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["30", "32", "39", "108"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "frock",
          "dress",
          "western wear",
        ]);
  }, [typedProducts, pageCategories]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />

      {shopCategories.length > 0 ? (
        <CategoriesSection
          categories={shopCategories as any}
          title="Shop by Category"
          productData={typedProducts}
        />
      ) : null}

      <NamedSection
        title="NEW DROPS"
        productData={newDrops}
        autoplay={false}
      />

      <HeroProductSection
        products={newDrops.slice(0, 10)}
        className="mb-4"
      />

      {nightDresses.length > 0 ? (
        <NamedSection
          title="NIGHT DRESSES"
          productData={nightDresses}
        />
      ) : null}

      {pants.length > 0 ? (
        <NamedSection
          title="PANTS & JEANS"
          productData={pants}
        />
      ) : null}

      {frocks.length > 0 ? (
        <NamedSection
          title="FROCKS & DRESSES"
          productData={frocks}
        />
      ) : null}

      <CollectionTabs />

      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Kids;