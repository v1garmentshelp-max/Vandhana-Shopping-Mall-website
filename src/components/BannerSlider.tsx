import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface BannerSlide {
  id: string | number;
  desktopImage: string;
  mobileImage?: string;
  link?: string;
  alt?: string;
}

interface BannerSliderProps {
  title?: string;
  slides: BannerSlide[];
  className?: string;
}

const BannerSlider: React.FC<BannerSliderProps> = ({
  title,
  slides,
  className,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" }, // align start is better for 2-column layouts
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi],
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi],
  );
  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (!slides || slides.length === 0) return null;

  return (
    <section
      className={`py-8 lg:py-10 w-full overflow-hidden bg-white ${className}`}
    >
      {title && (
        <div className="w-full px-2 mx-auto mb-2 md:mb-8">
          <h2 className="text-left md:text-center text-2xl md:text-3xl font-black text-[#1f2937] tracking-widest uppercase font-big-shoulders">
            {title}
          </h2>
        </div>
      )}

      <div className="relative group w-full px-2 lg:px-6">
        {/* Carousel Viewport */}
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex -ml-2  ">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="flex-[0_0_100%] lg:flex-[0_0_50%] min-w-0 pl-2 relative"
              >
                <a
                  href={slide.link || "#"}
                  className="block w-full group/banner"
                >
                  <div className="rounded-2xl overflow-hidden shadow-sm transition-transform duration-500">
                    <picture>
                      {slide.mobileImage && (
                        <source
                          media="(max-width: 767px)"
                          srcSet={slide.mobileImage}
                        />
                      )}
                      <img
                        loading={index === 0 ? "eager" : "lazy"}
                        src={slide.desktopImage}
                        alt={slide.alt || "Banner"}
                        className="w-full h-full object-cover aspect-video md:aspect-auto"
                      />
                    </picture>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Hidden on Mobile */}
        <button
          onClick={scrollPrev}
          className="absolute top-1/2 left-10 md:left-14 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center text-white rounded-full transition-all z-10 cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={32} strokeWidth={2} />
        </button>

        <button
          onClick={scrollNext}
          className="absolute top-1/2 right-10 md:right-14 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center text-white rounded-full transition-all z-10 cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Next Slide"
        >
          <ChevronRight size={32} strokeWidth={2} />
        </button>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ${
                index === selectedIndex
                  ? "w-8 bg-black"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BannerSlider;
