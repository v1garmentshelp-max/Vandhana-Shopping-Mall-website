import React, { useState, useEffect, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Wrapper from "./Wrapper";
import type { Product } from "../Models/Product";
import { Link } from "react-router";

interface HeroProductSectionProps {
  products: Product[];
  className?: string;
}

const getProductImage = (product?: Product | null) => {
  const images = Array.isArray(product?.images) ? product?.images.filter(Boolean) : [];
  return images?.[0] || "/placeholder.svg";
};

const HeroProductSection: React.FC<HeroProductSectionProps> = ({
  products,
  className,
}) => {
  const [activeProduct, setActiveProduct] = useState<Product | null>(products?.[0] || null);
  const [isPaused, setIsPaused] = useState(false);
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true });
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  useEffect(() => {
    setActiveProduct(products?.[0] || null);
  }, [products]);

  const onSelect = useCallback(() => {
    if (!mainApi || !products?.length) return;
    const selectedIndex = mainApi.selectedScrollSnap();
    setActiveProduct(products[selectedIndex] || products[0]);
  }, [mainApi, products]);

  useEffect(() => {
    if (!mainApi) return;
    mainApi.on("select", onSelect);
    return () => {
      mainApi.off("select", onSelect);
    };
  }, [mainApi, onSelect]);

  useEffect(() => {
    if (!activeProduct || !products?.length) return;

    const index = products.findIndex(
      (p) => String(p.id) === String(activeProduct.id),
    );

    if (index === -1) return;

    if (mainApi && mainApi.selectedScrollSnap() !== index) {
      mainApi.scrollTo(index);
    }

    if (thumbApi) {
      thumbApi.scrollTo(index);
    }
  }, [activeProduct, mainApi, thumbApi, products]);

  useEffect(() => {
    if (isPaused || !products || products.length <= 1) return;

    const interval = setInterval(() => {
      setActiveProduct((prev) => {
        const currentIndex = products.findIndex(
          (p) => String(p.id) === String(prev?.id),
        );
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % products.length : 0;
        return products[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, products]);

  if (!products || products.length === 0 || !activeProduct) return null;

  return (
    <section
      className={`w-full bg-[#111111] py-6 md:py-10 overflow-hidden md:max-h-[calc(100vh-52px)] ${className || ""}`}
    >
      <Wrapper className="lg:px-40! px-4!">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12 items-center">
          <div className="order-2 lg:order-1 flex flex-col items-start text-white">
            <div
              key={String(activeProduct.id)}
              className="animate-in fade-in slide-in-from-left-4 duration-700"
            >
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">
                {activeProduct.brand || ""}
              </p>
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
                {activeProduct.originalPrice && activeProduct.originalPrice > activeProduct.price && (
                  <span className="text-3xl md:text-4xl text-gray-600 line-through tracking-tighter">
                    ₹{activeProduct.originalPrice}
                  </span>
                )}
              </div>
            </div>

            <Link
              to={`/product/${encodeURIComponent(String(activeProduct.id))}`}
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
            <div
              className="overflow-hidden rounded-[3rem] bg-[#1a1a1a]"
              ref={mainRef}
            >
              <div className="flex">
                {products.map((product) => (
                  <div
                    className="flex-[0_0_100%] aspect-5/6 md:aspect-square"
                    key={String(product.id)}
                  >
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
                {products.map((product) => {
                  const isActive = String(activeProduct.id) === String(product.id);

                  return (
                    <div
                      key={String(product.id)}
                      onClick={() => setActiveProduct(product)}
                      className={`relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-500 ${
                        isActive
                          ? "border-white scale-95 opacity-100"
                          : "border-transparent opacity-40 hover:opacity-70"
                      }`}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.title}
                        className="w-full h-full object-cover object-top"
                      />
                      {isActive && !isPaused && (
                        <div className="absolute bottom-0 left-0 h-1 bg-white animate-[progress_4s_linear]" />
                      )}
                    </div>
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