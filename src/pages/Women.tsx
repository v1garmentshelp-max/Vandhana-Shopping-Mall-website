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
import { fetchCategoriesByGender, fetchProductsByGender, type StorefrontCategory } from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  { id: 1, image: poster1, alt: "Oversized Tees Offer", link: "/collections?gender=Women" },
  { id: 2, image: poster2, alt: "Oversized Tees Offer", link: "/collections?gender=Women" },
  { id: 3, image: poster3, alt: "Anniversary Bash Sale", link: "/collections?gender=Women" },
  { id: 4, image: poster4, alt: "Anniversary Bash Sale", link: "/collections?gender=Women" },
  { id: 5, image: poster6, alt: "Anniversary Bash Sale", link: "/collections?gender=Women" },
];

const bannerSlides: BannerSlide[] = [
  { id: 1, desktopImage: banner1, link: "/collections?gender=Women" },
  { id: 2, desktopImage: banner2, link: "/collections?gender=Women" },
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
    const text = normalizeText(`${product.title} ${product.product_name} ${product.name} ${product.categoryName} ${product.category_name}`);
    return words.some((word) => text.includes(normalizeText(word)));
  });
};

const Women = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);
  const [pageCategories, setPageCategories] = useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Women");
    localStorage.setItem("preferred_gender_url", "/women");
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, cats] = await Promise.all([
          fetchProductsByGender("Women", 3),
          fetchCategoriesByGender("Women"),
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

  const kurthiPantSets = useMemo(() => {
    const matched = bySlug(typedProducts, ["kurthi-pant-set"]);
    return matched.length ? matched : byName(typedProducts, ["kurti pant set", "kurthi pant set", "kurti", "kurthi"]);
  }, [typedProducts]);

  const tops = useMemo(() => {
    const matched = bySlug(typedProducts, ["tops", "t-shirts"]);
    return matched.length ? matched : byName(typedProducts, ["top", "t shirt"]);
  }, [typedProducts]);

  const pants = useMemo(() => {
    const matched = bySlug(typedProducts, ["pants", "cargo-pants"]);
    return matched.length ? matched : byName(typedProducts, ["ladies pant", "pant", "cargo"]);
  }, [typedProducts]);

  const jeans = useMemo(() => {
    const matched = bySlug(typedProducts, ["jeans"]);
    return matched.length ? matched : byName(typedProducts, ["jean", "denim", "beggi"]);
  }, [typedProducts]);

  return (
    <div>
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection categories={pageCategories as any} title="Shop by Category" productData={typedProducts} />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops.slice(0, 10)} className="mb-4" />
      {!!kurthiPantSets.length && <NamedSection title="KURTHI PANT SETS" productData={kurthiPantSets} />}
      {!!tops.length && <NamedSection title="TOPWEAR" productData={tops} />}
      <BannerSlider title="Latest Offers" slides={bannerSlides} className="py-4! md:py-8! md:pb-0!" />
      {!!pants.length && <NamedSection title="PANTS" productData={pants} />}
      {!!jeans.length && <NamedSection title="JEANS" productData={jeans} />}
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Women;