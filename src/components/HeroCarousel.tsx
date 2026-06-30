import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

export interface Banner {
  id: number;
  image: string;
  alt: string;
  link: string;
}

const isExternalLink = (link: string) => /^(https?:)?\/\//.test(link);

const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!banners || banners.length === 0) return null;

  const renderBannerContent = (banner: Banner) => (
    <div className="overflow-hidden shadow-xl aspect-5/6 rounded-xl">
      <img
        src={banner.image}
        alt={banner.alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
  );

  return (
    <section className="w-full bg-white py-4 overflow-hidden px-2 md:px-4">
      <div className="overflow-hidden w-full cursor-grab" ref={emblaRef}>
        <div className="flex -ml-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%]"
            >
              {isExternalLink(banner.link) ? (
                <a
                  href={banner.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full"
                >
                  {renderBannerContent(banner)}
                </a>
              ) : (
                <Link to={banner.link || "/collections"} className="block w-full">
                  {renderBannerContent(banner)}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-3 md:mt-4">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 rounded-full cursor-pointer h-2.5 ${
              index === selectedIndex
                ? "w-8 bg-secondary"
                : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide page ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;