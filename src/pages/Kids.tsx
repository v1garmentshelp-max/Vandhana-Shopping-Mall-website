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
import { fetchHomepageConfiguration, type HomepageImageMap } from "../services/homepageImagesApi";
import { fetchCategoriesByGender, fetchProductsByGender, type StorefrontCategory } from "../services/productsApi";

const normalizeText = (value: any) => String(value || "").toLowerCase().replace(/-/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const productDesignIdentity = (product: Product) => {
  const designCode = String((product as any).designCode ?? (product as any).design_code ?? "").trim().toLowerCase();
  if (designCode) return `design|${designCode}`;
  const productId = String((product as any).productId ?? (product as any).product_id ?? product.id ?? "").trim().toLowerCase();
  if (productId) return `product|${productId}`;
  return `fallback|${normalizeText(`${(product as any).title || (product as any).product_name || (product as any).name || ""} ${(product as any).brand || (product as any).brand_name || ""}`)}`;
};

const dedupeByDesign = (products: Product[]) => {
  const seen = new Set<string>();
  return products.filter(product => {
    const key = productDesignIdentity(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCategoryId = (category: any) => String(category?.id || "").trim();
const getCategoryParentId = (category: any) => String(category?.parentId ?? category?.parent_id ?? "").trim();
const getProductCategoryId = (product: any) => String(product?.categoryId ?? product?.category_id ?? "").trim();

const getCategoryDescendantIds = (categories: StorefrontCategory[], rootCategoryIds: string[]) => {
  const ids = new Set(rootCategoryIds.map(String).map(id => id.trim()).filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    categories.forEach(category => {
      const id = getCategoryId(category);
      const parentId = getCategoryParentId(category);
      if (id && parentId && ids.has(parentId) && !ids.has(id)) {
        ids.add(id);
        changed = true;
      }
    });
  }
  return ids;
};

const byCategoryIds = (products: Product[], categories: StorefrontCategory[], categoryIds: string[]) => {
  const allowedIds = getCategoryDescendantIds(categories, categoryIds);
  return dedupeByDesign(products.filter((product: any) => allowedIds.has(getProductCategoryId(product))));
};

const byName = (products: Product[], words: string[]) => {
  const searchWords = words.map(normalizeText).filter(Boolean);
  return dedupeByDesign(products.filter((product: any) => {
    const text = normalizeText(`${product.title || ""} ${product.product_name || ""} ${product.name || ""} ${product.categoryName || ""} ${product.category_name || ""} ${product.categoryPath || ""} ${product.category_path || ""}`);
    return searchWords.some(word => text.includes(word));
  }));
};

type KidsAudience = "boys" | "girls";

const getCategorySearchText = (category: any) => normalizeText(
  `${category?.name || ""} ${category?.categoryName || ""} ${category?.category_name || ""} ${category?.categoryPath || ""} ${category?.category_path || ""} ${category?.slug || ""}`,
);

const getAudienceCategoryIds = (categories: StorefrontCategory[], audience: KidsAudience) => {
  const audienceWords = audience === "boys" ? ["boy", "boys"] : ["girl", "girls"];
  const rootIds = categories
    .filter(category => {
      const text = getCategorySearchText(category);
      return audienceWords.some(word => text.split(" ").includes(word));
    })
    .map(getCategoryId)
    .filter(Boolean);

  return getCategoryDescendantIds(categories, rootIds);
};

const filterProductsByAudience = (products: Product[], categories: StorefrontCategory[], audience: KidsAudience) => {
  const categoryIds = getAudienceCategoryIds(categories, audience);
  const categoryMatches = dedupeByDesign(
    products.filter((product: any) => categoryIds.has(getProductCategoryId(product))),
  );

  if (categoryMatches.length > 0) return categoryMatches;

  return byName(
    products,
    audience === "boys" ? ["boy", "boys", "kids boy"] : ["girl", "girls", "kids girl"],
  );
};

const getKidsShopCategories = (categories: StorefrontCategory[]) => {
  const activeCategories = categories.filter((category: any) => {
    if (!getCategoryId(category)) return false;
    if (category?.is_active === false) return false;
    if (category?.selectable === false) return false;
    return true;
  });

  const topLevelCategories = activeCategories
    .filter((category: any) => Number(category?.level) === 1)
    .sort((first: any, second: any) => {
      const firstOrder = Number(first?.sort_order) || 0;
      const secondOrder = Number(second?.sort_order) || 0;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return String(first?.name || "").localeCompare(String(second?.name || ""));
    });

  const result: any[] = [];

  topLevelCategories.forEach((parent: any, parentIndex) => {
    const parentId = getCategoryId(parent);
    const children = activeCategories
      .filter((category: any) => getCategoryParentId(category) === parentId)
      .sort((first: any, second: any) => {
        const firstOrder = Number(first?.sort_order) || 0;
        const secondOrder = Number(second?.sort_order) || 0;
        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
        return String(first?.name || "").localeCompare(String(second?.name || ""));
      });

    if (children.length === 0) {
      result.push({ ...parent, __parentOrder: parentIndex, __childOrder: Number(parent?.sort_order) || 0 });
      return;
    }

    children.forEach((category: any) => {
      const parentName = String(parent?.name || "").trim();
      const categoryName = String(category?.name || "").trim();
      const displayName = parentName && !normalizeText(categoryName).startsWith(normalizeText(parentName)) ? `${parentName} ${categoryName}` : categoryName;
      result.push({ ...category, name: displayName, __parentOrder: parentIndex, __childOrder: Number(category?.sort_order) || 0 });
    });
  });

  const uniqueCategories = new Map<string, any>();

  result.forEach(category => {
    const categoryId = getCategoryId(category);
    if (categoryId && !uniqueCategories.has(categoryId)) uniqueCategories.set(categoryId, category);
  });

  return Array.from(uniqueCategories.values()).sort((first: any, second: any) => {
    const firstParent = Number(first?.__parentOrder) || 0;
    const secondParent = Number(second?.__parentOrder) || 0;
    if (firstParent !== secondParent) return firstParent - secondParent;
    const firstChild = Number(first?.__childOrder) || 0;
    const secondChild = Number(second?.__childOrder) || 0;
    if (firstChild !== secondChild) return firstChild - secondChild;
    return String(first?.name || "").localeCompare(String(second?.name || ""), undefined, { numeric: true });
  });
};

const Kids = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);
  const [pageCategories, setPageCategories] = useState<StorefrontCategory[]>([]);
  const [posterMap, setPosterMap] = useState<HomepageImageMap>({});
  const [postersLoaded, setPostersLoaded] = useState(false);
  const [activeAudience, setActiveAudience] = useState<KidsAudience>("boys");

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Kids");
    localStorage.setItem("preferred_gender_url", "/kids");
  }, []);

  useEffect(() => {
    let alive = true;
    const loadData = async () => {
      try {
        const [products, categories] = await Promise.all([fetchProductsByGender("Kids", 3), fetchCategoriesByGender("Kids")]);
        if (!alive) return;
        setTypedProducts(dedupeByDesign(Array.isArray(products) ? products : []));
        setPageCategories((Array.isArray(categories) ? categories : []).filter((category: any) => category?.is_active !== false));
      } catch (error) {
        console.error("Failed to load Kids page data:", error);
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

  useEffect(() => {
    let alive = true;
    fetchHomepageConfiguration("kids")
      .then(data => {
        if (alive) {
          setPosterMap(data.images);
          setPostersLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setPosterMap({});
          setPostersLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const heroBanners = useMemo<Banner[]>(() => [
    { id: 5, image: posterMap["kids.hero.1"]?.imageUrl || poster5, alt: posterMap["kids.hero.1"]?.altText || "Kids Collection", link: posterMap["kids.hero.1"]?.link || "/collections?gender=Kids" },
    { id: 1, image: posterMap["kids.hero.2"]?.imageUrl || poster1, alt: posterMap["kids.hero.2"]?.altText || "Anniversary Bash Sale", link: posterMap["kids.hero.2"]?.link || "/collections?gender=Kids" },
    { id: 2, image: posterMap["kids.hero.3"]?.imageUrl || poster2, alt: posterMap["kids.hero.3"]?.altText || "Jeans Collection", link: posterMap["kids.hero.3"]?.link || "/collections?gender=Kids&category_id=27" },
    { id: 3, image: posterMap["kids.hero.4"]?.imageUrl || poster3, alt: posterMap["kids.hero.4"]?.altText || "Kids Wear", link: posterMap["kids.hero.4"]?.link || "/collections?gender=Kids" },
    { id: 4, image: posterMap["kids.hero.5"]?.imageUrl || poster4, alt: posterMap["kids.hero.5"]?.altText || "Kids Fashion", link: posterMap["kids.hero.5"]?.link || "/collections?gender=Kids" }
  ], [posterMap]);

  const audienceCategoryIds = useMemo(
    () => getAudienceCategoryIds(pageCategories, activeAudience),
    [pageCategories, activeAudience],
  );

  const audienceCategories = useMemo(
    () => pageCategories.filter(category => audienceCategoryIds.has(getCategoryId(category))),
    [pageCategories, audienceCategoryIds],
  );

  const audienceProducts = useMemo(
    () => filterProductsByAudience(typedProducts, pageCategories, activeAudience),
    [typedProducts, pageCategories, activeAudience],
  );

  const shopCategories = useMemo(
    () => getKidsShopCategories(audienceCategories),
    [audienceCategories],
  );

  const newDrops = useMemo(() => dedupeByDesign(audienceProducts), [audienceProducts]);

  const nightDresses = useMemo(() => {
    const matched = byCategoryIds(audienceProducts, pageCategories, ["24", "36"]);
    return matched.length ? matched : byName(audienceProducts, ["night dress"]);
  }, [audienceProducts, pageCategories]);

  const pants = useMemo(() => {
    const matched = byCategoryIds(audienceProducts, pageCategories, ["25", "26", "27", "28", "29", "35", "37", "38"]);
    return matched.length ? matched : byName(audienceProducts, ["pant", "bagge", "baggy", "jean", "cargo", "jogger", "short"]);
  }, [audienceProducts, pageCategories]);

  const frocks = useMemo(() => {
    const matched = byCategoryIds(audienceProducts, pageCategories, ["30", "32", "39", "108"]);
    return matched.length ? matched : byName(audienceProducts, ["frock", "dress", "western wear"]);
  }, [audienceProducts, pageCategories]);

  return (
    <div className="w-full bg-white">
      {postersLoaded ? <HeroCarousel banners={heroBanners} /> : <div className="w-full aspect-[16/6] bg-neutral-100 animate-pulse" />}
      <div className="flex justify-center gap-3 px-4 py-5">
        <button
          type="button"
          onClick={() => setActiveAudience("boys")}
          className={`min-w-32 rounded-full border px-6 py-3 text-sm font-semibold transition-colors ${activeAudience === "boys" ? "border-secondary bg-secondary text-white" : "border-neutral-300 bg-white text-neutral-800 hover:border-secondary"}`}
        >
          Kids-Boys
        </button>
        <button
          type="button"
          onClick={() => setActiveAudience("girls")}
          className={`min-w-32 rounded-full border px-6 py-3 text-sm font-semibold transition-colors ${activeAudience === "girls" ? "border-secondary bg-secondary text-white" : "border-neutral-300 bg-white text-neutral-800 hover:border-secondary"}`}
        >
          Kids-Girls
        </button>
      </div>
      {shopCategories.length > 0 ? <CategoriesSection categories={shopCategories as any} title="Shop by Category" productData={audienceProducts} /> : null}
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops.slice(0, 10)} className="mb-4" />
      {nightDresses.length > 0 ? <NamedSection title="NIGHT DRESSES" productData={nightDresses} /> : null}
      {pants.length > 0 ? <NamedSection title="PANTS & JEANS" productData={pants} /> : null}
      {frocks.length > 0 ? <NamedSection title="FROCKS & DRESSES" productData={frocks} /> : null}
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Kids;