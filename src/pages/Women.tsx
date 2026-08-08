import { useEffect, useMemo, useState } from "react";
import CategoriesSection from "../components/CategoriesSection";
import HeroCarousel, { type Banner } from "../components/HeroCarousel";
import poster1 from "../assets/hero-poster-7.jpeg";
import poster2 from "../assets/hero-poster-8.jpeg";
import poster4 from "../assets/hero-poster-9.jpeg";
import poster3 from "../assets/hero-poster-3.jpeg";
import poster6 from "../assets/hero-poster-6.jpeg";
import NamedSection from "../components/NamedSection";
import type { Product } from "../Models/Product";
import HeroProductSection from "../components/HeroProductSection";
import BannerSlider, { type BannerSlide } from "../components/BannerSlider";
import banner1 from "../assets/offers-poster-5.jpeg";
import banner2 from "../assets/offers-poster-6.jpeg";
import FeaturesSection from "../components/FeaturesSection";
import { CollectionTabs } from "../components/CollectionTabs";
import {
  fetchCategoriesByGender,
  fetchProductsByGender,
  type StorefrontCategory,
} from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  {
    id: 1,
    image: poster1,
    alt: "Oversized Tees Offer",
    link: "/collections?gender=Women&category_id=128",
  },
  {
    id: 2,
    image: poster2,
    alt: "Oversized Tees Offer",
    link: "/collections?gender=Women&category_id=128",
  },
  {
    id: 3,
    image: poster3,
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Women",
  },
  {
    id: 4,
    image: poster4,
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Women",
  },
  {
    id: 5,
    image: poster6,
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Women",
  },
];

const bannerSlides: BannerSlide[] = [
  {
    id: 1,
    desktopImage: banner1,
    link: "/collections?gender=Women",
  },
  {
    id: 2,
    desktopImage: banner2,
    link: "/collections?gender=Women",
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

const productDesignIdentity = (product: Product) => {
  const designCode = String(
    (product as any).designCode ??
      (product as any).design_code ??
      "",
  )
    .trim()
    .toLowerCase();

  if (designCode) {
    return `design|${designCode}`;
  }

  const productId = String(
    (product as any).productId ??
      (product as any).product_id ??
      product.id ??
      "",
  )
    .trim()
    .toLowerCase();

  if (productId) {
    return `product|${productId}`;
  }

  return `fallback|${normalizeText(
    `${
      (product as any).title ||
      (product as any).product_name ||
      (product as any).name ||
      ""
    } ${
      (product as any).brand ||
      (product as any).brand_name ||
      ""
    }`,
  )}`;
};

const dedupeByDesign = (products: Product[]) => {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = productDesignIdentity(product);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

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

  return dedupeByDesign(
    products.filter((product: any) =>
      allowedIds.has(getProductCategoryId(product)),
    ),
  );
};

const byName = (
  products: Product[],
  words: string[],
) => {
  const searchWords = words
    .map(normalizeText)
    .filter(Boolean);

  return dedupeByDesign(
    products.filter((product: any) => {
      const text = normalizeText(
        `${product.title || ""} ${
          product.product_name || ""
        } ${product.name || ""} ${
          product.categoryName || ""
        } ${product.category_name || ""} ${
          product.categoryPath || ""
        } ${product.category_path || ""}`,
      );

      return searchWords.some((word) =>
        text.includes(word),
      );
    }),
  );
};

const getShopCategories = (
  categories: StorefrontCategory[],
) => {
  const uniqueCategories = new Map<
    string,
    StorefrontCategory
  >();

  categories.forEach((category: any) => {
    const categoryId = getCategoryId(category);

    if (!categoryId) {
      return;
    }

    if (category?.is_active === false) {
      return;
    }

    if (category?.selectable === false) {
      return;
    }

    if (Number(category?.level) !== 1) {
      return;
    }

    if (!uniqueCategories.has(categoryId)) {
      uniqueCategories.set(
        categoryId,
        category,
      );
    }
  });

  return Array.from(
    uniqueCategories.values(),
  ).sort((first: any, second: any) => {
    const firstOrder =
      Number(first?.sort_order) || 0;

    const secondOrder =
      Number(second?.sort_order) || 0;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return String(
      first?.name || "",
    ).localeCompare(
      String(second?.name || ""),
    );
  });
};

const Women = () => {
  const [typedProducts, setTypedProducts] =
    useState<Product[]>([]);

  const [pageCategories, setPageCategories] =
    useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem(
      "preferred_gender",
      "Women",
    );

    localStorage.setItem(
      "preferred_gender_url",
      "/women",
    );
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, categories] =
          await Promise.all([
            fetchProductsByGender("Women", 3),
            fetchCategoriesByGender("Women"),
          ]);

        if (!alive) {
          return;
        }

        setTypedProducts(
          dedupeByDesign(
            Array.isArray(products)
              ? products
              : [],
          ),
        );

        setPageCategories(
          (
            Array.isArray(categories)
              ? categories
              : []
          ).filter(
            (category: any) =>
              category?.is_active !== false,
          ),
        );
      } catch (error) {
        console.error(
          "Failed to load Women page data:",
          error,
        );

        if (!alive) {
          return;
        }

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
      getShopCategories(
        pageCategories,
      ),
    [pageCategories],
  );

  const newDrops = useMemo(
    () =>
      dedupeByDesign(
        typedProducts,
      ),
    [typedProducts],
  );

  const kurthiPantSets = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["15"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "kurti pant set",
          "kurthi pant set",
          "kurti",
          "kurthi",
        ]);
  }, [typedProducts, pageCategories]);

  const tops = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["12", "13"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "top",
          "t shirt",
          "oversized",
          "round neck",
        ]);
  }, [typedProducts, pageCategories]);

  const pants = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["17", "18"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "ladies pant",
          "pant",
          "cargo",
        ]);
  }, [typedProducts, pageCategories]);

  const jeans = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["16"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "jean",
          "denim",
          "beggi",
          "baggy",
        ]);
  }, [typedProducts, pageCategories]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel
        banners={HERO_BANNERS}
      />

      {shopCategories.length > 0 ? (
        <CategoriesSection
          categories={
            shopCategories as any
          }
          title="Shop by Category"
          productData={
            typedProducts
          }
        />
      ) : null}

      <NamedSection
        title="NEW DROPS"
        productData={newDrops}
        autoplay={false}
      />

      <HeroProductSection
        products={newDrops.slice(
          0,
          10,
        )}
        className="mb-4"
      />

      {kurthiPantSets.length > 0 ? (
        <NamedSection
          title="KURTHI PANT SETS"
          productData={
            kurthiPantSets
          }
        />
      ) : null}

      {tops.length > 0 ? (
        <NamedSection
          title="TOPWEAR"
          productData={tops}
        />
      ) : null}

      <BannerSlider
        title="Latest Offers"
        slides={bannerSlides}
        className="py-4! md:py-8! md:pb-0!"
      />

      {pants.length > 0 ? (
        <NamedSection
          title="PANTS"
          productData={pants}
        />
      ) : null}

      {jeans.length > 0 ? (
        <NamedSection
          title="JEANS"
          productData={jeans}
        />
      ) : null}

      <CollectionTabs />

      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Women;