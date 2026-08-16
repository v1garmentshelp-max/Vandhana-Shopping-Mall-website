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
import { fetchHomepageConfiguration, type HomepageImageMap, type HomepageSectionSettingsMap } from "../services/homepageImagesApi";
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

const getShopCategories = (categories: StorefrontCategory[]) => {
  const uniqueCategories = new Map<string, StorefrontCategory>();
  categories.forEach((category: any) => {
    const categoryId = getCategoryId(category);
    if (!categoryId || category?.is_active === false || category?.selectable === false || Number(category?.level) !== 1) return;
    if (!uniqueCategories.has(categoryId)) uniqueCategories.set(categoryId, category);
  });
  return Array.from(uniqueCategories.values()).sort((first: any, second: any) => {
    const firstOrder = Number(first?.sort_order) || 0;
    const secondOrder = Number(second?.sort_order) || 0;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return String(first?.name || "").localeCompare(String(second?.name || ""));
  });
};

const Men = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);
  const [pageCategories, setPageCategories] = useState<StorefrontCategory[]>([]);
  const [posterMap, setPosterMap] = useState<HomepageImageMap>({});
  const [posterSettings, setPosterSettings] = useState<HomepageSectionSettingsMap>({});
  const [postersLoaded, setPostersLoaded] = useState(false);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Men");
    localStorage.setItem("preferred_gender_url", "/men");
  }, []);

  useEffect(() => {
    let alive = true;
    const loadData = async () => {
      try {
        const [products, categories] = await Promise.all([fetchProductsByGender("Men", 3), fetchCategoriesByGender("Men")]);
        if (!alive) return;
        setTypedProducts(dedupeByDesign(Array.isArray(products) ? products : []));
        setPageCategories((Array.isArray(categories) ? categories : []).filter((category: any) => category?.is_active !== false));
      } catch (error) {
        console.error("Failed to load Men page data:", error);
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
    fetchHomepageConfiguration("men")
      .then(data => {
        if (alive) {
          setPosterMap(data.images);
          setPosterSettings(data.settings);
          setPostersLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setPosterMap({});
          setPosterSettings({});
          setPostersLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const heroBanners = useMemo<Banner[]>(() => [
    { id: 1, image: posterMap["men.hero.1"]?.imageUrl || poster1, alt: posterMap["men.hero.1"]?.altText || "Anniversary Bash Sale", link: posterMap["men.hero.1"]?.link || "/collections?gender=Men" },
    { id: 2, image: posterMap["men.hero.2"]?.imageUrl || poster2, alt: posterMap["men.hero.2"]?.altText || "Jeans Collection", link: posterMap["men.hero.2"]?.link || "/collections?gender=Men&category_id=6" },
    { id: 3, image: posterMap["men.hero.3"]?.imageUrl || poster3, alt: posterMap["men.hero.3"]?.altText || "Oversized Tees Offer", link: posterMap["men.hero.3"]?.link || "/collections?gender=Men&category_id=111" },
    { id: 4, image: posterMap["men.hero.4"]?.imageUrl || poster6, alt: posterMap["men.hero.4"]?.altText || "Anniversary Bash Sale", link: posterMap["men.hero.4"]?.link || "/collections?gender=Men" },
    { id: 5, image: posterMap["men.hero.5"]?.imageUrl || poster4, alt: posterMap["men.hero.5"]?.altText || "Jeans Collection", link: posterMap["men.hero.5"]?.link || "/collections?gender=Men&category_id=6" },
    { id: 6, image: posterMap["men.hero.6"]?.imageUrl || poster5, alt: posterMap["men.hero.6"]?.altText || "Oversized Tees Offer", link: posterMap["men.hero.6"]?.link || "/collections?gender=Men&category_id=111" }
  ], [posterMap]);

  const bannerSlides = useMemo<BannerSlide[]>(() => [
    { id: 1, desktopImage: posterMap["men.offer.1"]?.imageUrl || banner1, link: posterMap["men.offer.1"]?.link || "/collections?gender=Men" },
    { id: 2, desktopImage: posterMap["men.offer.2"]?.imageUrl || banner2, link: posterMap["men.offer.2"]?.link || "/collections?gender=Men" },
    { id: 3, desktopImage: posterMap["men.offer.3"]?.imageUrl || banner4, link: posterMap["men.offer.3"]?.link || "/collections?gender=Men" },
    { id: 4, desktopImage: posterMap["men.offer.4"]?.imageUrl || banner3, link: posterMap["men.offer.4"]?.link || "/collections?gender=Men" }
  ], [posterMap]);

  const shopCategories = useMemo(() => getShopCategories(pageCategories), [pageCategories]);
  const newDrops = useMemo(() => dedupeByDesign(typedProducts), [typedProducts]);

  const tshirts = useMemo(() => {
    const matched = byCategoryIds(typedProducts, pageCategories, ["4"]);
    return matched.length ? matched : byName(typedProducts, ["t shirt", "oversized", "round neck", "polo"]);
  }, [typedProducts, pageCategories]);

  const cargos = useMemo(() => {
    const matched = byCategoryIds(typedProducts, pageCategories, ["9"]);
    return matched.length ? matched : byName(typedProducts, ["cargo"]);
  }, [typedProducts, pageCategories]);

  const pants = useMemo(() => {
    const matched = byCategoryIds(typedProducts, pageCategories, ["7"]);
    return matched.length ? matched : byName(typedProducts, ["pant"]);
  }, [typedProducts, pageCategories]);

  return (
    <div className="w-full bg-white">
      {postersLoaded ? <HeroCarousel banners={heroBanners} /> : <div className="w-full aspect-[16/6] bg-neutral-100 animate-pulse" />}
      {shopCategories.length > 0 ? <CategoriesSection categories={shopCategories as any} title="Shop by Category" productData={typedProducts} /> : null}
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops.slice(0, 10)} className="mb-4" />
      {tshirts.length > 0 ? <NamedSection title="T-SHIRTS & POLO" productData={tshirts} /> : null}
      {postersLoaded && posterSettings["men.offer"] !== false ? <BannerSlider title="Latest Offers" slides={bannerSlides} className="py-4! md:py-8! md:pb-0!" /> : null}
      {cargos.length > 0 ? <NamedSection title="CARGO PANTS" productData={cargos} /> : null}
      {pants.length > 0 ? <NamedSection title="PANTS" productData={pants} /> : null}
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Men;