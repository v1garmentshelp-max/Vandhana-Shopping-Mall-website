import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
export interface Banner {
  id: number;
  image: string;
  alt: string;
  link: string;
}

const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  // 1. Initialize Embla with Loop, Start Alignment, and Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    [
      Autoplay({
        delay: 3000, // Slides change every 6 seconds
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  // Callback to update active dot index
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Click handler for dots
  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  // Set up snaps on init and select listener
  useEffect(() => {
    if (!emblaApi) return;

    // In start align with 3 items visible, Embla only has 1 "page" of 3 snaps.
    // This gives us [...0, 1, 2...] which we can map to dots.
    setScrollSnaps(emblaApi.scrollSnapList());

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (!banners || banners.length === 0) return null;

  return (
    <section className="w-full bg-white py-4 overflow-hidden px-2 md:px-4">
      {/* Carousel Viewport */}
      <div className="overflow-hidden w-full cursor-grab" ref={emblaRef}>
        {/* Carousel Container (The "Track") */}
        <div className="flex -ml-4">
          {/* -ml accounts for the gutter spacing between slides */}
          {banners.map((banner) => (
            <div
              key={banner.id}
              // Mobile: 1 banner | Tablet: 2 banners | Desktop: 3 banners visible
              className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%]"
            >
              <a href={banner.link} className="block w-full">
                <div className="overflow-hidden shadow-xl aspect-5/6 rounded-xl">
                  <img
                    src={banner.image}
                    alt={banner.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* --- Pagination Dots Bar --- */}
      <div className="flex justify-center gap-2 mt-3 md:mt-4">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 rounded-full cursor-pointer h-2.5 ${
              index === selectedIndex
                ? "w-8 bg-secondary" // Active: Primary Yellow color, elongated pill
                : "w-2.5 bg-gray-300 hover:bg-gray-400" // Inactive: Grey dot
            }`}
            aria-label={`Go to slide page ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
