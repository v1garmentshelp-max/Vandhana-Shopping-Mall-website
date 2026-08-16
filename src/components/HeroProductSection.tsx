import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Wrapper from "./Wrapper";
import type { Product } from "../Models/Product";
import { Link } from "react-router";

interface HeroProductSectionProps {
  products: Product[];
  className?: string;
}

const getProductKey = (product?: Product | null, index = 0) =>
  String(
    product?.designCode ||
      product?.design_code ||
      product?.routeKey ||
      product?.route_key ||
      product?.groupKey ||
      product?.group_key ||
      product?.productId ||
      product?.product_id ||
      product?.id ||
      `product-${index}`,
  ).trim();

const getProductRoute = (product?: Product | null) =>
  encodeURIComponent(getProductKey(product));

const getImageUrl = (value: any) => {
  if (typeof value === "string") return value.trim();

  return String(
    value?.image_url ||
      value?.imageUrl ||
      value?.secure_url ||
      value?.url ||
      "",
  ).trim();
};

const getProductImage = (product?: Product | null) => {
  const values = [
    product?.frontImageUrl,
    product?.front_image_url,
    product?.mainImageUrl,
    product?.main_image_url,
    product?.imageUrl,
    product?.image_url,
    ...(Array.isArray(product?.images) ? product.images : []),
  ];

  return values.map(getImageUrl).find(Boolean) || "/placeholder.svg";
};

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

const HeroProductSection: React.FC<HeroProductSectionProps> = ({
  products,
  className,
}) => {
  const displayProducts = useMemo(
    () => dedupeProducts(Array.isArray(products) ? products : []),
    [products],
  );
  const [activeProduct, setActiveProduct] = useState<Product | null>(
    displayProducts[0] || null,
  );
  const [isPaused, setIsPaused] = useState(false);
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true });
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  useEffect(() => {
    setActiveProduct(current => {
      const currentKey = getProductKey(current);
      return displayProducts.find(product => getProductKey(product) === currentKey) || displayProducts[0] || null;
    });
  }, [displayProducts]);

  const onSelect = useCallback(() => {
    if (!mainApi || !displayProducts.length) return;

    const selectedIndex = mainApi.selectedScrollSnap();
    setActiveProduct(displayProducts[selectedIndex] || displayProducts[0]);
  }, [mainApi, displayProducts]);

  useEffect(() => {
    if (!mainApi) return;

    mainApi.on("select", onSelect);

    return () => {
      mainApi.off("select", onSelect);
    };
  }, [mainApi, onSelect]);

  useEffect(() => {
    if (!activeProduct || !displayProducts.length) return;

    const activeKey = getProductKey(activeProduct);
    const index = displayProducts.findIndex(product => getProductKey(product) === activeKey);

    if (index < 0) return;

    if (mainApi && mainApi.selectedScrollSnap() !== index) {
      mainApi.scrollTo(index);
    }

    thumbApi?.scrollTo(index);
  }, [activeProduct, mainApi, thumbApi, displayProducts]);

  useEffect(() => {
    if (isPaused || displayProducts.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveProduct(current => {
        const currentKey = getProductKey(current);
        const currentIndex = displayProducts.findIndex(product => getProductKey(product) === currentKey);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % displayProducts.length : 0;
        return displayProducts[nextIndex];
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isPaused, displayProducts]);

  if (!displayProducts.length || !activeProduct) return null;

  const patternType = activeProduct.patternType || activeProduct.pattern_type || "";

  return (
    <section className={`w-full bg-[#111111] py-6 md:py-10 overflow-hidden md:max-h-[calc(100vh-52px)] ${className || ""}`}>
      <Wrapper className="lg:px-40! px-4!">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12 items-center">
          <div className="order-2 lg:order-1 flex flex-col items-start text-white">
            <div key={getProductKey(activeProduct)} className="animate-in fade-in slide-in-from-left-4 duration-700">
              {patternType ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                    {patternType}
                  </span>
                </div>
              ) : null}
              <h1 className="text-3xl md:text-5xl font-black font-big-shoulders uppercase tracking-tight">
                {activeProduct.title}
              </h1>
              <p className="mt-4 md:mt-8 text-gray-400 font-poppins text-lg md:text-xl leading-relaxed max-w-lg">
                {activeProduct.description}
              </p>
              <div className="mt-4 md:mt-10 flex items-center gap-4 font-source-sans">
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                  ₹{activeProduct.price}
                </span>
                {activeProduct.originalPrice && activeProduct.originalPrice > activeProduct.price ? (
                  <span className="text-3xl md:text-4xl text-gray-600 line-through tracking-tighter">
                    ₹{activeProduct.originalPrice}
                  </span>
                ) : null}
              </div>
            </div>

            <Link
              to={`/product/${getProductRoute(activeProduct)}`}
              className="mt-4 md:mt-10 group flex items-center gap-3 bg-white text-black pl-1 pr-8 py-1 rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <div className="bg-black text-white p-3 rounded-full group-hover:-rotate-45 transition-transform duration-300">
                <ArrowRight size={24} />
              </div>
              <span className="font-poppins font-bold uppercase tracking-widest text-sm">
                Shop Now
              </span>
            </Link>
          </div>

          <div
            className="order-1 lg:order-2 flex flex-col gap-6 md:px-10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="overflow-hidden rounded-[3rem] bg-[#1a1a1a]" ref={mainRef}>
              <div className="flex">
                {displayProducts.map((product, index) => (
                  <div className="flex-[0_0_100%] aspect-5/6 md:aspect-square" key={getProductKey(product, index)}>
                    <img
                      src={getProductImage(product)}
                      alt={product.title}
                      className="w-full h-full object-cover object-top transition-opacity duration-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden pb-4" ref={thumbRef}>
              <div className="flex gap-4">
                {displayProducts.map((product, index) => {
                  const productKey = getProductKey(product, index);
                  const isActive = getProductKey(activeProduct) === productKey;

                  return (
                    <button
                      type="button"
                      key={productKey}
                      onClick={() => setActiveProduct(product)}
                      className={`relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-500 ${isActive ? "border-white scale-95 opacity-100" : "border-transparent opacity-40 hover:opacity-70"}`}
                      aria-label={`Show ${product.title}`}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.title}
                        className="w-full h-full object-cover object-top"
                      />
                      {isActive && !isPaused ? (
                        <span className="absolute bottom-0 left-0 h-1 bg-white animate-[progress_4s_linear]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    </section>
  );
};

export default HeroProductSection;