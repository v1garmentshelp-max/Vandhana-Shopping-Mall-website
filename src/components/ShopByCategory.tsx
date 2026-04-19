import React from "react";
import { useNavigate } from "react-router"; // Use navigate instead of window.location
import { ChevronRight } from "lucide-react";
import Wrapper from "./Wrapper";
import KidsImage from "../assets/kids.jpeg";

const CAT_IMAGES = {
  man: "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555eb738d1f865fb32b1a_1.jpeg",
  woman:
    "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555e49a2cdcab119ad9b2_2.jpeg",
  kids: KidsImage,
};

interface CardProps {
  label: string;
  image: string;
  onSelect: (gender: string) => void;
  className?: string;
  aspectMobile?: string;
}

// Reusable Card Component to keep code clean
const CategoryCard: React.FC<CardProps> = ({
  label,
  image,
  onSelect,
  className = "",
  aspectMobile = "aspect-[1/2]",
}) => (
  <div
    onClick={() => onSelect(label)}
    className={`relative group overflow-hidden rounded-3xl ${aspectMobile} md:aspect-4/5 shadow-2xl cursor-pointer ${className}`}
  >
    <img
      src={image}
      alt={`${label} Collection`}
      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110"
    />
    {/* Corrected gradient class */}
    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
    <div className="absolute bottom-4 left-4 md:bottom-10 md:left-10">
      <h3 className="text-3xl md:text-6xl font-black text-white font-big-shoulders tracking-normal uppercase">
        {label}
      </h3>
      <button className="mt-1 md:mt-4 flex items-center gap-2 text-[#FFD700] font-poppins font-bold text-sm tracking-widest group/btn">
        {label === "Kids" ? "EXPLORE" : "SHOP NOW"}
        <ChevronRight
          size={18}
          className="transition-transform group-hover/btn:translate-x-2"
        />
      </button>
    </div>
  </div>
);

const ShopByCategory: React.FC = () => {
  const navigate = useNavigate();

  const handleSelect = (gender: string) => {
    const path = `/${gender.toLowerCase()}`;
    localStorage.setItem("preferred_gender", gender);
    localStorage.setItem("preferred_gender_url", path);
    navigate(path); // SPA navigation
  };

  return (
    <section className="w-full bg-white py-10 px-4 md:px-12">
      <Wrapper className="px-0!">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-black font-big-shoulders uppercase">
            Shop by Category<span className="text-[#FFD700]">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <CategoryCard
            label="Men"
            image={CAT_IMAGES.man}
            onSelect={handleSelect}
          />

          <CategoryCard
            label="Women"
            image={CAT_IMAGES.woman}
            onSelect={handleSelect}
          />

          <CategoryCard
            label="Kids"
            image={CAT_IMAGES.kids}
            onSelect={handleSelect}
            className="col-span-2 md:col-span-1"
            aspectMobile="aspect-[3/4]" // Better aspect for full-width mobile card
          />
        </div>
      </Wrapper>
    </section>
  );
};

export default ShopByCategory;
