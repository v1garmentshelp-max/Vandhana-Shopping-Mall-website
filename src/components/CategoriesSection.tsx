import useEmblaCarousel from "embla-carousel-react";
import Wrapper from "./Wrapper";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { Category } from "../Models/Category";

const CategoriesSection = ({
  categories,
  title,
}: {
  categories: Category[];
  title?: string;
}) => {
  // 1. Initialize Embla for mobile layout
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
    breakpoints: {
      "(min-width: 1024px)": { active: false }, // Disable carousel on desktop
    },
  });

  return (
    <div className="w-full bg-white pt-6 md:pt-10 md:py-16 px-2 md:px-6">
      <Wrapper className="px-0!">
        {/* Section Header */}
        {title && (
          <div className="text-left mb-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black font-big-shoulders uppercase">
              {title}
              <span className="text-[#FFD700]">.</span>
            </h2>
          </div>
        )}

        {/* --- CAROUSEL (Mobile) / GRID (Desktop) --- */}
        <div className="overflow-hidden md:overflow-visible" ref={emblaRef}>
          <div className="flex flex-col flex-wrap h-[440px] lg:h-auto lg:flex-row lg:grid lg:grid-cols-5 gap-2 lg:gap-4">
            {/* Explanation for Mobile:
                - h-[650px]: Sets a fixed height for the container to force items to wrap into a second row.
                - flex-col + flex-wrap: Essential to create the 2-row vertical-to-horizontal flow.
            */}
            {categories.map((category) => {
              const catParam = category.name.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={category.id}
                  to={`/collections?category=${encodeURIComponent(catParam)}`}
                  className="flex-[0_0_48%] lg:flex-none relative group cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl shadow-xl aspect-3/4 block"
                >
                  {/* Background Image */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent"></div>

                  {/* BOTTOM TEXT CONTENT */}
                  <div className="absolute bottom-4 left-4 flex items-center justify-between w-[calc(100%-2rem)] gap-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white tracking-tight uppercase font-big-shoulders opacity-90 wrap-break-word">
                      {category.name}
                    </h3>

                    <button className="shrink-0 flex items-center justify-center h-8 w-8 md:h-10 md:w-10 bg-white/20 rounded-full">
                      <ChevronRight
                        size={18}
                        className="text-white transform group-hover:-rotate-40 transition-transform"
                      />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default CategoriesSection;
