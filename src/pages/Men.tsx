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
import type { Category } from "../Models/Category";
import categories from "../Data/categories.json";
import type { Product } from "../Models/Product";
import poster1 from "../assets/hero-poster-1.jpeg";
import poster2 from "../assets/hero-poster-2.jpeg";
import poster3 from "../assets/hero-poster-3.jpeg";
import poster4 from "../assets/hero-poster-4.jpeg";
import poster5 from "../assets/hero-poster-5.jpeg";
import poster6 from "../assets/hero-poster-6.jpeg";
import { CollectionTabs } from "../components/CollectionTabs";
import { fetchProductsByGender } from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  {
    id: 1,
    image: poster1,
    alt: "Anniversary Bash Sale",
    link: "/collections",
  },
  {
    id: 2,
    image: poster2,
    alt: "Jeans Collection",
    link: "/collections",
  },
  {
    id: 3,
    image: poster3,
    alt: "Oversized Tees Offer",
    link: "/collections",
  },
  {
    id: 4,
    image: poster6,
    alt: "Anniversary Bash Sale",
    link: "/collections",
  },
  {
    id: 5,
    image: poster4,
    alt: "Jeans Collection",
    link: "/collections",
  },
  {
    id: 6,
    image: poster5,
    alt: "Oversized Tees Offer",
    link: "/collections",
  },
];

const bannerSlides: BannerSlide[] = [
  {
    id: 1,
    desktopImage: banner1,
    link: "/",
  },
  {
    id: 2,
    desktopImage: banner2,
    link: "/",
  },
  {
    id: 3,
    desktopImage: banner4,
    link: "/",
  },
  {
    id: 4,
    desktopImage: banner3,
    link: "/",
  },
];

const Men = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Men");
    localStorage.setItem("preferred_gender_url", "/men");
  }, []);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      try {
        const data = await fetchProductsByGender("Men", 3);
        if (alive) setTypedProducts(data);
      } catch {
        if (alive) setTypedProducts([]);
      }
    };

    void loadProducts();

    return () => {
      alive = false;
    };
  }, []);

  const menCatId = categories.find(
    (c: Category) => c.name === "Men" && c.level === 0,
  )?.id;

  const menTopId = categories.find(
    (c: Category) => c.name === "Topwear" && c.parentId === menCatId,
  )?.id;

  const menBottomId = categories.find(
    (c: Category) => c.name === "Bottomwear" && c.parentId === menCatId,
  )?.id;

  const menCategories = categories.filter(
    (category: Category) =>
      category.parentId === menTopId || category.parentId === menBottomId,
  );

  const newDrops = useMemo(() => {
    return typedProducts
      .filter((product: Product) => product.gender === "Men")
      .slice(0, 10);
  }, [typedProducts]);

  const joggers = useMemo(() => {
    const joggerCatIds = categories
      .filter((c: Category) => c.name.toLowerCase() === "joggers")
      .map((c) => c.id);

    return typedProducts.filter(
      (product: Product) =>
        product.gender === "Men" && joggerCatIds.includes(String(product.categoryId)),
    );
  }, [typedProducts]);

  const vests = useMemo(() => {
    const vestCatIds = categories
      .filter((c: Category) => c.name.toLowerCase() === "vests")
      .map((c) => c.id);

    return typedProducts.filter(
      (product: Product) =>
        product.gender === "Men" && vestCatIds.includes(String(product.categoryId)),
    );
  }, [typedProducts]);

  const topwear = useMemo(() => {
    const topwearCat = categories.filter(
      (category: Category) => category.parentId === menTopId,
    );

    const topwearCatIds = topwearCat.map((category: Category) => category.id);

    return typedProducts.filter(
      (product: Product) =>
        product.gender === "Men" && topwearCatIds.includes(String(product.categoryId)),
    );
  }, [typedProducts, menTopId]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection categories={menCategories} title="Shop by Category" productData={typedProducts} />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops} className="mb-4" />
      <NamedSection title="Hot Summer Picks" productData={vests} />
      <BannerSlider
        title="Latest Offers"
        slides={bannerSlides}
        className="py-4! md:py-8! md:pb-0!"
      />
      <NamedSection title="JOGGERS" productData={joggers} />
      <NamedSection title="TOPWEAR" productData={topwear} />
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Men;