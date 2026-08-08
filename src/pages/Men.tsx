import FeaturesSection from "../components/FeaturesSection";
import NamedSection from "../components/NamedSection";
import HeroProductSection from "../components/HeroProductSection";
import BannerSlider from "../components/BannerSlider";
import type { BannerSlide } from "../components/BannerSlider";
import banner1 from "../assets/offers-poster-3.jpeg";
import banner2 from "../assets/offers-poster-4.jpeg";
import banner3 from "../assets/offers-poster-1.jpeg";
import banner4 from "../assets/offers-poster-2.jpeg";
import HeroCarousel, { type Banner } from "../components/HeroCarousel";
import { useEffect, useMemo, useState } from "react";
import CategoriesSection from "../components/CategoriesSection";
import type { Product } from "../Models/Product";
import poster1 from "../assets/hero-poster-1.jpeg";
import poster2 from "../assets/hero-poster-2.jpeg";
import poster3 from "../assets/hero-poster-3.jpeg";
import poster4 from "../assets/hero-poster-4.jpeg";
import poster5 from "../assets/hero-poster-5.jpeg";
import poster6 from "../assets/hero-poster-6.jpeg";
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
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Men",
  },
  {
    id: 2,
    image: poster2,
    alt: "Jeans Collection",
    link: "/collections?gender=Men&category_id=6",
  },
  {
    id: 3,
    image: poster3,
    alt: "Oversized Tees Offer",
    link: "/collections?gender=Men&category_id=111",
  },
  {
    id: 4,
    image: poster6,
    alt: "Anniversary Bash Sale",
    link: "/collections?gender=Men",
  },
  {
    id: 5,
    image: poster4,
    alt: "Jeans Collection",
    link: "/collections?gender=Men&category_id=6",
  },
  {
    id: 6,
    image: poster5,
    alt: "Oversized Tees Offer",
    link: "/collections?gender=Men&category_id=111",
  },
];

const bannerSlides: BannerSlide[] = [
  {
    id: 1,
    desktopImage: banner1,
    link: "/collections?gender=Men",
  },
  {
    id: 2,
    desktopImage: banner2,
    link: "/collections?gender=Men",
  },
  {
    id: 3,
    desktopImage: banner4,
    link: "/collections?gender=Men",
  },
  {
    id: 4,
    desktopImage: banner3,
    link: "/collections?gender=Men",
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

    return String(first?.name || "").localeCompare(
      String(second?.name || ""),
    );
  });
};

const Men = () => {
  const [typedProducts, setTypedProducts] =
    useState<Product[]>([]);

  const [pageCategories, setPageCategories] =
    useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem(
      "preferred_gender",
      "Men",
    );

    localStorage.setItem(
      "preferred_gender_url",
      "/men",
    );
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, categories] =
          await Promise.all([
            fetchProductsByGender("Men", 3),
            fetchCategoriesByGender("Men"),
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
          "Failed to load Men page data:",
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

  const tshirts = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["4"],
    );

    return matched.length
      ? matched
      : byName(typedProducts, [
          "t shirt",
          "oversized",
          "round neck",
          "polo",
        ]);
  }, [typedProducts, pageCategories]);

  const cargos = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["9"],
    );

    return matched.length
      ? matched
      : byName(
          typedProducts,
          ["cargo"],
        );
  }, [typedProducts, pageCategories]);

  const pants = useMemo(() => {
    const matched = byCategoryIds(
      typedProducts,
      pageCategories,
      ["7"],
    );

    return matched.length
      ? matched
      : byName(
          typedProducts,
          ["pant"],
        );
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

      {tshirts.length > 0 ? (
        <NamedSection
          title="T-SHIRTS & POLO"
          productData={tshirts}
        />
      ) : null}

      <BannerSlider
        title="Latest Offers"
        slides={bannerSlides}
        className="py-4! md:py-8! md:pb-0!"
      />

      {cargos.length > 0 ? (
        <NamedSection
          title="CARGO PANTS"
          productData={cargos}
        />
      ) : null}

      {pants.length > 0 ? (
        <NamedSection
          title="PANTS"
          productData={pants}
        />
      ) : null}

      <CollectionTabs />

      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Men;