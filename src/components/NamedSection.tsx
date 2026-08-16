import { useCallback, useMemo } from "react";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import Wrapper from "./Wrapper";
import type { Product } from "../Models/Product";

const getProductKey = (product: Product, index = 0) =>
  String(
    product.designCode ||
      product.design_code ||
      product.routeKey ||
      product.route_key ||
      product.groupKey ||
      product.group_key ||
      product.productId ||
      product.product_id ||
      product.id ||
      `product-${index}`,
  ).trim();

const dedupeProducts = (products: Product[]) => {
  const map = new Map<string, Product>();

  products.forEach((product, index) => {
    const key = getProductKey(product, index);

    if (!map.has(key)) {
      map.set(key, product);
    }
  });

  return Array.from(map.values());
};

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
  const products = useMemo(
    () => dedupeProducts(Array.isArray(productData) ? productData : []),
    [productData],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" }, [
    Autoplay({
      delay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      active: autoplay,
    }),
  ]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (!products.length) return null;

  return (
    <section className="py-6 bg-white overflow-hidden px-2">
      <Wrapper className="px-0!">
        <div className="mb-4 md:mb-8 flex flex-wrap flex-row md:items-end justify-between gap-6 md:gap-0">
          <div className="max-w-2xl">
            {title ? (
              <>
                <h2 className="text-3xl md:text-4xl font-black font-big-shoulders capitalize tracking-normal text-black">
                  {title}
                </h2>
                <div className="w-[80%] h-[4px] bg-primary mt-0 overflow-hidden" />
              </>
            ) : null}

            {description ? (
              <p className="mt-4 text-gray-500 font-poppins text-lg leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>

          {products.length > 1 ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={scrollPrev}
                className="p-1 flex items-center justify-center rounded-full border border-gray-200 text-primary hover:bg-black hover:text-white hover:border-black transition-all bg-black cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                className="p-1 flex items-center justify-center rounded-full border border-gray-200 text-primary hover:bg-black hover:text-white hover:border-black transition-all bg-black cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-2">
            {products.map((product, index) => (
              <div
                key={getProductKey(product, index)}
                className="flex-[0_0_46%] min-w-0 pl-2 sm:flex-[0_0_45%] md:flex-[0_0_28%] lg:flex-[0_0_21%]"
              >
                <ProductCard {...product} showBrand={false} />
              </div>
            ))}
          </div>
        </div>
      </Wrapper>
    </section>
  );
};

export default NamedSection;