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
import { fetchCategoriesByGender, fetchProductsByGender, type StorefrontCategory } from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  { id: 5, image: poster5, alt: "Kids Collection", link: "/collections?gender=Kids" },
  { id: 1, image: poster1, alt: "Anniversary Bash Sale", link: "/collections?gender=Kids" },
  { id: 2, image: poster2, alt: "Jeans Collection", link: "/collections?gender=Kids" },
  { id: 3, image: poster3, alt: "Kids Wear", link: "/collections?gender=Kids" },
  { id: 4, image: poster4, alt: "Kids Fashion", link: "/collections?gender=Kids" },
];

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const bySlug = (products: Product[], slugs: string[]) => {
  const set = new Set(slugs.map(normalizeText));
  return products.filter((product: any) => set.has(normalizeText(product.categorySlug || product.category_slug)));
};

const byName = (products: Product[], words: string[]) => {
  return products.filter((product: any) => {
    const text = normalizeText(`${product.title} ${product.product_name} ${product.name} ${product.categoryName} ${product.category_name} ${product.categoryPath} ${product.category_path}`);
    return words.some((word) => text.includes(normalizeText(word)));
  });
};

const Kids = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);
  const [pageCategories, setPageCategories] = useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Kids");
    localStorage.setItem("preferred_gender_url", "/kids");
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, cats] = await Promise.all([
          fetchProductsByGender("Kids", 3),
          fetchCategoriesByGender("Kids"),
        ]);

        if (alive) {
          setTypedProducts(products);
          setPageCategories(cats);
        }
      } catch {
        if (alive) {
          setTypedProducts([]);
          setPageCategories([]);
        }
      }
    };

    void loadData();

    return () => {
      alive = false;
    };
  }, []);

  const newDrops = useMemo(() => typedProducts, [typedProducts]);

  const nightDresses = useMemo(() => {
    const matched = bySlug(typedProducts, ["night-dress", "girls-night-dress"]);
    return matched.length ? matched : byName(typedProducts, ["night dress"]);
  }, [typedProducts]);

  const pants = useMemo(() => {
    const matched = bySlug(typedProducts, ["pants", "jeans", "cargo-pants"]);
    return matched.length ? matched : byName(typedProducts, ["pant", "bagge", "jean", "cargo"]);
  }, [typedProducts]);

  const frocks = useMemo(() => {
    const matched = bySlug(typedProducts, ["western-wear", "dress"]);
    return matched.length ? matched : byName(typedProducts, ["frock", "dress"]);
  }, [typedProducts]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection categories={pageCategories as any} title="Shop by Category" productData={typedProducts} />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops.slice(0, 10)} className="mb-4" />
      {!!nightDresses.length && <NamedSection title="NIGHT DRESSES" productData={nightDresses} />}
      {!!pants.length && <NamedSection title="PANTS & JEANS" productData={pants} />}
      {!!frocks.length && <NamedSection title="FROCKS & DRESSES" productData={frocks} />}
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Kids;