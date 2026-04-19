import HeroCarousel from "../components/HeroCarousel";
import type { Banner } from "../components/HeroCarousel";
import poster1 from "../assets/hero-poster-10.jpeg";
import poster2 from "../assets/hero-poster-11.jpeg";
import poster3 from "../assets/hero-poster-12.jpeg";
import poster4 from "../assets/hero-poster-13.jpeg";
import poster5 from "../assets/hero-poster-14.jpeg";
import { useEffect } from "react";

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
  useEffect(() => {
    localStorage.setItem("preferred_gender", "Kids");
    localStorage.setItem("preferred_gender_url", "/kids");
  }, []);

  return (
    <div className="w-full bg-white">
      <HeroCarousel banners={HERO_BANNERS} />
    </div>
  );
};

export default Kids;
