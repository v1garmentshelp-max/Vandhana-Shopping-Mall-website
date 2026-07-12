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
import { fetchCategoriesByGender, fetchProductsByGender, type StorefrontCategory } from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  { id: 1, image: poster1, alt: "Anniversary Bash Sale", link: "/collections?gender=Men" },
  { id: 2, image: poster2, alt: "Jeans Collection", link: "/collections?gender=Men" },
  { id: 3, image: poster3, alt: "Oversized Tees Offer", link: "/collections?gender=Men" },
  { id: 4, image: poster6, alt: "Anniversary Bash Sale", link: "/collections?gender=Men" },
  { id: 5, image: poster4, alt: "Jeans Collection", link: "/collections?gender=Men" },
  { id: 6, image: poster5, alt: "Oversized Tees Offer", link: "/collections?gender=Men" },
];

const bannerSlides: BannerSlide[] = [
  { id: 1, desktopImage: banner1, link: "/collections?gender=Men" },
  { id: 2, desktopImage: banner2, link: "/collections?gender=Men" },
  { id: 3, desktopImage: banner4, link: "/collections?gender=Men" },
  { id: 4, desktopImage: banner3, link: "/collections?gender=Men" },
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

const Men = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);
  const [pageCategories, setPageCategories] = useState<StorefrontCategory[]>([]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Men");
    localStorage.setItem("preferred_gender_url", "/men");
  }, []);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [products, cats] = await Promise.all([
          fetchProductsByGender("Men", 3),
          fetchCategoriesByGender("Men"),
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

  const tshirts = useMemo(() => {
    const matched = bySlug(typedProducts, ["t-shirts-polo"]);
    return matched.length ? matched : byName(typedProducts, ["t shirt", "oversized", "polo"]);
  }, [typedProducts]);

  const cargos = useMemo(() => {
    const matched = bySlug(typedProducts, ["cargo-pants"]);
    return matched.length ? matched : byName(typedProducts, ["cargo"]);
  }, [typedProducts]);

  const pants = useMemo(() => {
    const matched = bySlug(typedProducts, ["pants"]);
    return matched.length ? matched : byName(typedProducts, ["pant"]);
  }, [typedProducts]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection categories={pageCategories as any} title="Shop by Category" productData={typedProducts} />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops.slice(0, 10)} className="mb-4" />
      {!!tshirts.length && <NamedSection title="T-SHIRTS & POLO" productData={tshirts} />}
      <BannerSlider title="Latest Offers" slides={bannerSlides} className="py-4! md:py-8! md:pb-0!" />
      {!!cargos.length && <NamedSection title="CARGO PANTS" productData={cargos} />}
      {!!pants.length && <NamedSection title="PANTS" productData={pants} />}
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Men;