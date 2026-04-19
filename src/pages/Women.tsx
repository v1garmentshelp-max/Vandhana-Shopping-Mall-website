import { useEffect } from "react";
import CategoriesSection from "../components/CategoriesSection";
import categories from "../Data/categories.json";
import type { Category } from "../Models/Category";
import HeroCarousel, { type Banner } from "../components/HeroCarousel";
import poster1 from "../assets/hero-poster-7.jpeg";
import poster2 from "../assets/hero-poster-8.jpeg";
import poster4 from "../assets/hero-poster-9.jpeg";
import poster3 from "../assets/hero-poster-3.jpeg";

import poster6 from "../assets/hero-poster-6.jpeg";
import NamedSection from "../components/NamedSection";
import type { Product } from "../Models/Product";

import products from "../Data/Products.json";
import HeroProductSection from "../components/HeroProductSection";
import BannerSlider, { type BannerSlide } from "../components/BannerSlider";

import banner1 from "../assets/offers-poster-5.jpeg";
import banner2 from "../assets/offers-poster-6.jpeg";
import FeaturesSection from "../components/FeaturesSection";
import { CollectionTabs } from "../components/CollectionTabs";

const HERO_BANNERS: Banner[] = [
  {
    id: 1,
    image: poster1,
    alt: "Oversized Tees Offer",
    link: "/collections",
  },
  {
    id: 2,
    image: poster2,
    alt: "Oversized Tees Offer",
    link: "/collections",
  },
  {
    id: 3,
    image: poster3,
    alt: "Anniversary Bash Sale",
    link: "/collections",
  },
  {
    id: 4,
    image: poster4,
    alt: "Anniversary Bash Sale",
    link: "/collections",
  },
  {
    id: 5,
    image: poster6,
    alt: "Anniversary Bash Sale",
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
];

const Women = () => {
  useEffect(() => {
    localStorage.setItem("preferred_gender", "Women");
    localStorage.setItem("preferred_gender_url", "/women");
  }, []);
  const womenCatId = categories.find(
    (c: Category) => c.name === "Women" && c.level === 0,
  )?.id;
  const womenTopId = categories.find(
    (c: Category) => c.name === "Topwear" && c.parentId === womenCatId,
  )?.id;
  const womenBottomId = categories.find(
    (c: Category) => c.name === "Bottomwear" && c.parentId === womenCatId,
  )?.id;
  const womenCategories = categories.filter(
    (category: Category) =>
      category.parentId === womenTopId || category.parentId === womenBottomId,
  );
  const typedProducts = products as unknown as Product[];

  const newDrops = typedProducts
    .filter((product: Product) => product.gender === "Women")
    .slice(0, 10);

  const shortsCatIds = categories
    .filter((c: Category) => c.name.toLowerCase() === "shorts")
    .map((c) => c.id);
  const shorts = typedProducts.filter(
    (product: Product) =>
      product.gender === "Women" && shortsCatIds.includes(product.categoryId),
  );

  const joggerCatIds = categories
    .filter((c: Category) => c.name.toLowerCase() === "joggers")
    .map((c) => c.id);
  const joggers = typedProducts.filter(
    (product: Product) =>
      product.gender === "Women" && joggerCatIds.includes(product.categoryId),
  );
  return (
    <div>
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection
        categories={womenCategories}
        title="Shop by Category"
      />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops} className="mb-4" />
      <NamedSection title="Hot Summer Picks" productData={shorts} />
      <BannerSlider
        title="Latest Offers"
        slides={bannerSlides}
        className="py-4! md:py-8! md:pb-0!"
      />
      <NamedSection title="JOGGERS" productData={joggers} />
      <CollectionTabs />
      {/* <Hero /> */}
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Women;
