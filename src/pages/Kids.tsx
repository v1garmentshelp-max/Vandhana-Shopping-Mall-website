import { useEffect, useMemo, useState } from "react";
import HeroCarousel from "../components/HeroCarousel";
import type { Banner } from "../components/HeroCarousel";
import poster1 from "../assets/hero-poster-10.jpeg";
import poster2 from "../assets/hero-poster-11.jpeg";
import poster3 from "../assets/hero-poster-12.jpeg";
import poster4 from "../assets/hero-poster-13.jpeg";
import poster5 from "../assets/hero-poster-14.jpeg";
import categories from "../Data/categories.json";
import type { Category } from "../Models/Category";
import type { Product } from "../Models/Product";
import CategoriesSection from "../components/CategoriesSection";
import NamedSection from "../components/NamedSection";
import HeroProductSection from "../components/HeroProductSection";
import FeaturesSection from "../components/FeaturesSection";
import { CollectionTabs } from "../components/CollectionTabs";
import { fetchProductsByGender } from "../services/productsApi";

const HERO_BANNERS: Banner[] = [
  {
    id: 5,
    image: poster5,
    alt: "Oversized Tees Offer",
    link: "/collections",
  },
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
    image: poster4,
    alt: "Jeans Collection",
    link: "/collections",
  },
];

const Kids = () => {
  const [typedProducts, setTypedProducts] = useState<Product[]>([]);

  useEffect(() => {
    localStorage.setItem("preferred_gender", "Kids");
    localStorage.setItem("preferred_gender_url", "/kids");
  }, []);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      try {
        const data = await fetchProductsByGender("Kids", 3);
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

  const kidsCatId = categories.find(
    (c: Category) => c.name === "Kids" && c.level === 0,
  )?.id;

  const kidsLevel1Ids = categories
    .filter((category: Category) => category.level === 1 && category.parentId === kidsCatId)
    .map((category: Category) => category.id);

  const kidsCategories = categories.filter(
    (category: Category) =>
      category.level === 2 && kidsLevel1Ids.includes(String(category.parentId || "")),
  );

  const fallbackKidsCategories = categories.filter(
    (category: Category) => category.level === 1 && category.parentId === kidsCatId,
  );

  const finalKidsCategories = kidsCategories.length ? kidsCategories : fallbackKidsCategories;

  const newDrops = useMemo(() => {
    return typedProducts
      .filter((product: Product) => product.gender === "Kids")
      .slice(0, 10);
  }, [typedProducts]);

  const topwear = useMemo(() => {
    const topwearParentIds = categories
      .filter((category: Category) => category.name.toLowerCase() === "topwear")
      .map((category: Category) => category.id);

    const topwearCatIds = categories
      .filter((category: Category) => topwearParentIds.includes(String(category.parentId || "")))
      .map((category: Category) => category.id);

    return typedProducts.filter(
      (product: Product) =>
        product.gender === "Kids" && topwearCatIds.includes(String(product.categoryId)),
    );
  }, [typedProducts]);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />
      <CategoriesSection categories={finalKidsCategories} title="Shop by Category" />
      <NamedSection title="NEW DROPS" productData={newDrops} autoplay={false} />
      <HeroProductSection products={newDrops} className="mb-4" />
      <NamedSection title="TOPWEAR" productData={topwear} />
      <CollectionTabs />
      <FeaturesSection className="my-4" />
    </div>
  );
};

export default Kids;