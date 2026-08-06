import React from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import Wrapper from "./Wrapper";
import KidsImage from "../assets/kids.jpeg";

const CAT_IMAGES = {
  Men: "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555eb738d1f865fb32b1a_1.jpeg",
  Women:
    "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555e49a2cdcab119ad9b2_2.jpeg",
  Kids: KidsImage,
};

type Gender = keyof typeof CAT_IMAGES;

interface CardProps {
  label: Gender;
  image: string;
  onSelect: (gender: Gender) => void;
  className?: string;
  aspectMobile?: string;
}

const CategoryCard: React.FC<CardProps> = ({
  label,
  image,
  onSelect,
  className = "",
  aspectMobile = "aspect-[1/2]",
}) => (
  <button
    type="button"
    onClick={() => onSelect(label)}
    className={`relative group overflow-hidden rounded-3xl ${aspectMobile} md:aspect-4/5 shadow-2xl cursor-pointer text-left w-full ${className}`}
    aria-label={`Shop ${label} collection`}
  >
    <img
      src={image}
      alt={`${label} Collection`}
      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110"
    />
    <span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
    <span className="absolute bottom-4 left-4 md:bottom-10 md:left-10">
      <span className="block text-3xl md:text-6xl font-black text-white font-big-shoulders tracking-normal uppercase">
        {label}
      </span>
      <span className="mt-1 md:mt-4 flex items-center gap-2 text-[#FFD700] font-poppins font-bold text-sm tracking-widest group/btn">
        {label === "Kids" ? "EXPLORE" : "SHOP NOW"}
        <ChevronRight
          size={18}
          className="transition-transform group-hover/btn:translate-x-2"
        />
      </span>
    </span>
  </button>
);

const ShopByCategory: React.FC = () => {
  const navigate = useNavigate();

  const handleSelect = (gender: Gender) => {
    const path = `/${gender.toLowerCase()}`;
    localStorage.setItem("preferred_gender", gender);
    localStorage.setItem("preferred_gender_url", path);
    navigate(path);
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
            image={CAT_IMAGES.Men}
            onSelect={handleSelect}
          />
          <CategoryCard
            label="Women"
            image={CAT_IMAGES.Women}
            onSelect={handleSelect}
          />
          <CategoryCard
            label="Kids"
            image={CAT_IMAGES.Kids}
            onSelect={handleSelect}
            className="col-span-2 md:col-span-1"
            aspectMobile="aspect-[3/4]"
          />
        </div>
      </Wrapper>
    </section>
  );
};

export default ShopByCategory;
