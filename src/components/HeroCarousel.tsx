import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [imagesReady, setImagesReady] = useState(false);

  const validBanners = useMemo(
    () =>
      Array.isArray(banners)
        ? banners.filter(
            banner =>
              banner &&
              typeof banner.image === "string" &&
              banner.image.trim().length > 0,
          )
        : [],
    [banners],
  );

  const bannerSignature = useMemo(
    () => validBanners.map(banner => banner.image).join("|"),
    [validBanners],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: validBanners.length > 1,
      align: "start",
      skipSnaps: false,
    },
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

  useEffect(() => {
    let active = true;

    setImagesReady(false);

    if (validBanners.length === 0) {
      setImagesReady(true);

      return () => {
        active = false;
      };
    }

    const preloadImages = validBanners.map(
      banner =>
        new Promise<void>(resolve => {
          const image = new Image();

          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = banner.image;

          if (image.complete) {
            resolve();
          }
        }),
    );

    Promise.all(preloadImages).then(() => {
      if (active) {
        setImagesReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [bannerSignature, validBanners]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) {
        emblaApi.scrollTo(index);
      }
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi || !imagesReady) return;

    emblaApi.reInit();
    setScrollSnaps(emblaApi.scrollSnapList());
    setSelectedIndex(emblaApi.selectedScrollSnap());

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, imagesReady, bannerSignature, onSelect]);

  if (validBanners.length === 0) return null;

  if (!imagesReady) {
    return (
      <section className="w-full overflow-hidden bg-white px-2 py-4 md:px-4">
        <div className="flex -ml-4">
          {validBanners.slice(0, 3).map(banner => (
            <div
              key={`${banner.id}-${banner.image}`}
              className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%]"
            >
              <div className="aspect-5/6 animate-pulse overflow-hidden rounded-xl bg-neutral-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const renderBannerContent = (banner: Banner, index: number) => (
    <div className="aspect-5/6 overflow-hidden rounded-xl shadow-xl">
      <img
        key={banner.image}
        src={banner.image}
        alt={banner.alt}
        loading={index < 3 ? "eager" : "lazy"}
        fetchPriority={index === 0 ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <section className="w-full overflow-hidden bg-white px-2 py-4 md:px-4">
      <div className="w-full cursor-grab overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {validBanners.map((banner, index) => (
            <div
              key={`${banner.id}-${banner.image}`}
              className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%]"
            >
              {isExternalLink(banner.link) ? (
                <a
                  href={banner.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full"
                >
                  {renderBannerContent(banner, index)}
                </a>
              ) : (
                <Link
                  to={banner.link || "/collections"}
                  className="block w-full"
                >
                  {renderBannerContent(banner, index)}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {scrollSnaps.length > 1 ? (
        <div className="mt-3 flex justify-center gap-2 md:mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2.5 cursor-pointer rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "w-8 bg-secondary"
                  : "w-2.5 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide page ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default HeroCarousel;