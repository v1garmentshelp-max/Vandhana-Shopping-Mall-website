import { useCallback } from "react";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import Wrapper from "./Wrapper";
import type { Product } from "../Models/Product";

const NamedSection = ({
  title,
  description,
  productData,
  autoplay = true,
  delay = 3000,
}: {
  title?: string;
  description?: string;
  productData: Product[];
  autoplay?: boolean;
  delay?: number;
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" }, [
    Autoplay({
      delay: delay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      active: autoplay,
    }),
  ]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!Array.isArray(productData) || productData.length === 0) return null;

  return (
    <section className="py-6 bg-white overflow-hidden px-2">
      <Wrapper className="px-0!">
        <div className="mb-4 md:mb-8 flex flex-wrap flex-row md:items-end justify-between gap-6 md:gap-0">
          <div className="max-w-2xl">
            {title && (
              <>
                <h2 className="text-3xl md:text-4xl font-black font-big-shoulders capitalize tracking-normal text-black">
                  {title}
                </h2>
                <div className="w-[80%] h-[4px] bg-primary mt-0 overflow-hidden" />
              </>
            )}

            {description && (
              <p className="mt-4 text-gray-500 font-poppins text-lg leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {productData.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={scrollPrev}
                className="p-1 flex items-center justify-center rounded-full border border-gray-200 text-primary hover:bg-black hover:text-white hover:border-black transition-all bg-black cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={scrollNext}
                className="p-1 flex items-center justify-center rounded-full border border-gray-200 text-primary hover:bg-black hover:text-white hover:border-black transition-all bg-black cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>

        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-2">
            {productData.map((product) => (
              <div
                key={`${product.id}-${product.barcode || ""}`}
                className="flex-[0_0_46%] min-w-0 pl-2 sm:flex-[0_0_45%] md:flex-[0_0_28%] lg:flex-[0_0_21%]"
              >
                <ProductCard {...product} />
              </div>
            ))}
          </div>
        </div>
      </Wrapper>
    </section>
  );
};

export default NamedSection;