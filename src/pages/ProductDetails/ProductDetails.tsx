import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import productData from "../../Data/Products.json";
import categoriesData from "../../Data/categories.json";
import type { Category } from "../../Models/Category";
import type { Product } from "../../Models/Product";
import CarouselModule from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import NamedSection from "../../components/NamedSection";

const Carousel = (CarouselModule as any).default || CarouselModule;
import {
  FiChevronLeft,
  FiChevronRight,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiTruck,
  FiHelpCircle,
  FiX,
  FiHeart,
  FiShare2,
} from "react-icons/fi";
import { FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";

const CustomLeftArrow = ({ onClick }: any) => (
  <button
    onClick={onClick}
    className="absolute opacity-0 group-hover:opacity-100 left-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 md:p-1 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"
  >
    <FiChevronLeft size={20} />
  </button>
);

const CustomRightArrow = ({ onClick }: any) => (
  <button
    onClick={onClick}
    className="absolute opacity-0 group-hover:opacity-100 right-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 md:p-1 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"
  >
    <FiChevronRight size={20} />
  </button>
);

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [cartError, setCartError] = useState("");
  const mainCarouselRef = useRef<any>(null);
  const lightboxCarouselRef = useRef<any>(null);
  const actionContainerRef = useRef<HTMLDivElement>(null);
  const desktopThumbContainerRef = useRef<HTMLDivElement>(null);
  const mobileThumbCarouselRef = useRef<any>(null);

  useEffect(() => {
    // Desktop thumb auto-scroll
    if (desktopThumbContainerRef.current) {
      const activeThumb = desktopThumbContainerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    // Mobile thumb carousel sync
    if (mobileThumbCarouselRef.current) {
      mobileThumbCarouselRef.current.goToSlide(selectedIndex);
    }
  }, [selectedIndex]);

  useEffect(() => {
    // In a real app we'd fetch this from the API or context
    const foundProduct = (productData as unknown as Product[]).find(
      (p) => p.id === id,
    );
    if (foundProduct) {
      setProduct(foundProduct as Product);

      try {
        const stored: string[] = JSON.parse(
          localStorage.getItem("recentlyViewed") || "[]",
        );
        const updated = [
          foundProduct.id,
          ...stored.filter((item: string) => item !== foundProduct.id),
        ].slice(0, 20);
        localStorage.setItem("recentlyViewed", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recently viewed:", err);
      }

      const initialOptions: Record<string, string> = {};
      if (foundProduct.colors?.length)
        initialOptions["Color"] = foundProduct.colors[0];
      if (foundProduct.sizes?.length)
        initialOptions["Size"] = foundProduct.sizes[0];
      setSelectedOptions(initialOptions);
    }
  }, [id]);

  const recommendedProducts = React.useMemo(() => {
    if (!product) return [];

    const categories = categoriesData as Category[];
    const productCategories = [
      product.gender.toLowerCase(),
      categories
        .find((c: Category) => c.id === product.categoryId)
        ?.name?.toLowerCase() || "",
    ];

    const validGenders = categories
      ?.filter((c: Category) => c.level === 0)
      .map((c: Category) => c.name.toLowerCase());
    const mainGender = productCategories.find((c) => validGenders.includes(c));

    const allProducts = productData as unknown as Product[];

    return allProducts
      .filter((p) => p.id !== product.id)
      .map((p) => {
        const categories = categoriesData as Category[];
        const targetCategories = [
          p.gender.toLowerCase(),
          categories.find((c) => c.id === p.categoryId)?.name?.toLowerCase() ||
            "",
        ];

        const hasSameGender = mainGender
          ? targetCategories.includes(mainGender)
          : true;

        const matchScore = targetCategories.filter((c) =>
          productCategories.includes(c),
        ).length;
        return { product: p, matchScore, hasSameGender };
      })
      .filter((item) => item.hasSameGender && item.matchScore > 1)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
      .map((item) => item.product);
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const currentPrice = product.price;
  const currentCompareAtPrice = product.originalPrice || product.price;
  const formatMoney = (val: number) => `₹${val}`;
  const currentVariant = {
    available:
      Object.values(product.stockBySize || {}).reduce((a, b) => a + b, 0) > 0,
    price: currentPrice,
  };
  const displayImages = product.images;

  const options_with_values = [];
  if (product.colors && product.colors.length > 0) {
    options_with_values.push({ name: "Color", values: product.colors });
  }
  if (product.sizes && product.sizes.length > 0) {
    options_with_values.push({ name: "Size", values: product.sizes });
  }

  const enhancedProduct = {
    ...product,
    options_with_values,
  };

  const handleOptionChange = (name: string, val: string) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: val }));
  };

  const getColorHex = (val: string) => {
    const map: Record<string, string> = {
      Black: "#000000",
      White: "#ffffff",
      Red: "#ef4444",
      Blue: "#3b82f6",
      Green: "#22c55e",
      Yellow: "#eab308",
      Gray: "#6b7280",
      Brown: "#78350f",
    };

    const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(val);

    if (isHex) return val;
    if (map[val]) return map[val];
    return val;
  };

  const handleQuantityChange = (type: "plus" | "minus") => {
    setQuantity((q) => (type === "plus" ? q + 1 : Math.max(1, q - 1)));
  };

  const handleAddToCart = () => {
    if (!currentVariant.available) {
      setCartError("Product is out of stock.");
      return;
    }
    setCartError("");
    setIsAdding(true);
    setTimeout(() => {
      setIsAdding(false);
      alert(`${quantity} x ${product.title} added to cart`);
    }, 1000);
  };

  const handleBuyNow = () => {
    if (!currentVariant.available) {
      setCartError("Product is out of stock.");
      return;
    }
    alert("Proceeding to checkout...");
  };

  // Carousel Configurations
  const mainResponsive = {
    desktop: { breakpoint: { max: 3000, min: 0 }, items: 1 },
  };

  const thumbResponsiveMobile = {
    mobile: {
      breakpoint: { max: 768, min: 0 },
      items: 4,
      slidesToSlide: 1,
      partialVisibilityGutter: 20,
    },
  };

  const handleThumbClick = (index: number) => {
    setSelectedIndex(index);
    if (mainCarouselRef.current) {
      // react-multi-carousel infinite mode adds cloned slides.
      // For items: 1, it usually prepends 2 cloned items.
      mainCarouselRef.current.goToSlide(index + 2);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: `Check out ${product.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const RatingStars = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full-${i}`} size={14} />
        ))}

        {hasHalfStar && <FaStarHalfAlt size={14} />}

        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty-${i}`} size={14} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full bg-white font-montserrat py-6 pt-4 md:py-8 lg:py-16 lg:pt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
          {/* LEFT: Image Gallery */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
            {/* Vertical Thumbnails (Desktop) */}
            {product.images.length > 1 && (
              <div
                ref={desktopThumbContainerRef}
                className="hidden lg:flex flex-col w-20 lg:w-22 shrink-0 -mt-2 overflow-y-auto h-[450px] xl:h-[600px] gap-3 py-2 scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {product.images.map((src: string, index: number) => (
                  <div
                    key={index}
                    className={`w-full aspect-3/4 rounded-[9px] shrink-0 cursor-pointer overflow-hidden transition-all ${
                      index === selectedIndex
                        ? "opacity-100 border border-[#292d35] p-[3px]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => handleThumbClick(index)}
                  >
                    <img
                      src={src}
                      alt={`Thumb ${index + 1}`}
                      loading={index < 4 ? "eager" : "lazy"}
                      className="w-full h-full object-cover aspect-3/4 object-top bg-gray-50 rounded-[6px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Main Image Carousel */}
            <div className="group flex-1 relative bg-white aspect-3/4 xl:aspect-4/5 overflow-hidden min-w-0 z-0">
              <Carousel
                ref={mainCarouselRef}
                responsive={mainResponsive}
                infinite={true}
                customLeftArrow={<CustomLeftArrow />}
                customRightArrow={<CustomRightArrow />}
                afterChange={(_prev: number, state: any) => {
                  const realIndex =
                    (state.currentSlide - 2 + product.images.length) %
                    product.images.length;
                  if (realIndex !== selectedIndex) {
                    setSelectedIndex(realIndex);
                  }
                }}
                itemClass="flex items-center justify-center h-full w-full"
                containerClass="h-full w-full"
                sliderClass="h-full"
              >
                {product.images.map((src: string, index: number) => (
                  <div
                    className="w-full h-full relative cursor-pointer"
                    key={index}
                    onClick={() => {
                      setLightboxIndex(index);
                      setIsLightboxOpen(true);
                      if (lightboxCarouselRef.current) {
                        lightboxCarouselRef.current.goToSlide(index + 2);
                      }
                    }}
                  >
                    <img
                      src={src}
                      alt={`${product.title} - Image ${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 w-full h-full object-cover object-top rounded-2xl"
                    />
                  </div>
                ))}
              </Carousel>

              {/* Floating Image Actions (Desktop/Mobile) */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-3 z-10">
                <button
                  onClick={handleShare}
                  aria-label="Share product"
                  className="w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-700 hover:text-black"
                >
                  <FiShare2 size={18} />
                </button>
                <button
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   toggleWishlist(product);
                  //   if (isFav) {
                  //     toast.success("Removed from Wishlist");
                  //   } else {
                  //     toast.success("Added to Wishlist");
                  //   }
                  // }}
                  aria-label="Toggle wishlist"
                  className={`w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer ${"text-gray-700 hover:text-black"}`}
                >
                  <FiHeart size={18} />
                </button>
              </div>
            </div>

            {/* Horizontal Thumbnails (Mobile) */}
            {product.images.length > 1 && (
              <div className="lg:hidden mt-4">
                <Carousel
                  ref={mobileThumbCarouselRef}
                  responsive={thumbResponsiveMobile}
                  arrows={false}
                  partialVisible={true}
                  itemClass="pr-3"
                >
                  {product.images.map((src: string, index: number) => (
                    <div
                      key={index}
                      className={`w-full aspect-3/4 cursor-pointer overflow-hidden transition-all snap-start ${
                        index === selectedIndex
                          ? "opacity-100 border border-black"
                          : "opacity-60"
                      }`}
                      onClick={() => handleThumbClick(index)}
                    >
                      <img
                        src={src}
                        alt={`Thumb ${index + 1}`}
                        className="w-full h-full object-cover bg-gray-50"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            )}
          </div>
          {/* RIGHT: Product Info */}
          <div className="flex-1 flex flex-col py-2 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
              {product.title}
            </h1>

            {/* Price & Reviews Row */}
            <div className="flex items-center flex-wrap gap-4 mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {formatMoney(currentPrice)}
              </span>

              {currentCompareAtPrice > currentPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatMoney(currentCompareAtPrice)}
                  </span>
                  <span className="text-base font-bold text-green-600 tracking-tight">
                    {Math.round(
                      ((currentCompareAtPrice - currentPrice) /
                        currentCompareAtPrice) *
                        100,
                    )}
                    % OFF
                  </span>
                </>
              )}

              <span className="text-gray-300 hidden sm:inline">|</span>

              {/* Dummy static reviews per mockup */}
              <div className="flex items-center gap-1 text-[#f5b82e]">
                <RatingStars rating={product.ratings?.average || 0} />
                <span className="text-gray-500 text-sm ml-2 font-medium">
                  ({product.ratings?.count || 0} reviews)
                </span>
              </div>
            </div>

            {/* Description Snippet */}
            <div
              className="prose prose-sm text-gray-500 leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: product.description }}
            ></div>

            {/* Variants */}
            <div className="flex flex-col gap-6 mb-6">
              {enhancedProduct.options_with_values?.map((option) => {
                const isColor = ["color", "colour"].includes(
                  option.name.toLowerCase(),
                );

                return (
                  <div key={option.name} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                        {option.name}
                      </span>
                      {/* {option.name.toLowerCase().includes("size") && (
                        <button className="flex items-center gap-1 text-xs font-bold font-source-sans uppercase text-gray-500 hover:text-black transition cursor-pointer">
                          <BiRuler size={14} /> Size Guide
                        </button>
                      )} */}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {option.values.map((val) => {
                        const isSelected = selectedOptions[option.name] === val;

                        // Color Swatches
                        if (isColor) {
                          return (
                            <button
                              key={val}
                              onClick={() =>
                                handleOptionChange(option.name, val)
                              }
                              title={val}
                              className={`w-8 h-8 rounded-full border border-gray-100 transition-all ${
                                isSelected
                                  ? "ring-2 ring-gray-400 ring-offset-2 scale-110"
                                  : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: getColorHex(val) }}
                              aria-label={`Select Color ${val}`}
                            />
                          );
                        }

                        // Size Pills
                        return (
                          <button
                            key={val}
                            onClick={() => handleOptionChange(option.name, val)}
                            className={`min-w-12 px-4 py-2.5 rounded-sm text-sm font-source-sans font-bold uppercase tracking-wider transition-all border ${
                              isSelected
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-800 border-gray-300 hover:border-gray-900"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add to Cart Area */}
            <div className="flex flex-col gap-4 mb-2">
              {/* Quantity */}
              <div className="flex items-center">
                <button
                  onClick={() => handleQuantityChange("minus")}
                  className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition"
                >
                  <FiMinus size={16} />
                </button>
                <input
                  type="text"
                  value={quantity}
                  readOnly
                  className="w-12 h-12 text-center text-gray-800 font-bold outline-none bg-white font-source-sans border-y border-gray-200"
                />
                <button
                  onClick={() => handleQuantityChange("plus")}
                  className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition"
                >
                  <FiPlus size={16} />
                </button>
              </div>

              {/* Action Buttons */}
              <div
                ref={actionContainerRef}
                className="md:flex hidden flex-col sm:flex-row gap-3 w-full"
              >
                <button
                  onClick={handleAddToCart}
                  disabled={
                    isAdding || (currentVariant && !currentVariant.available)
                  }
                  className={`flex-1 cursor-pointer py-3.5 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border
                    ${
                      currentVariant && !currentVariant.available
                        ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  {isAdding ? (
                    <span className="animate-pulse">Adding...</span>
                  ) : (
                    <>
                      <FiShoppingBag size={16} className="mb-0.5" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={currentVariant && !currentVariant.available}
                  className={`flex-1 py-3.5 cursor-pointer flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border
                    ${
                      currentVariant && !currentVariant.available
                        ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed"
                        : "bg-primary/90 hover:bg-primary text-black border-primary"
                    }
                  `}
                >
                  <span>Buy Now</span>
                </button>
              </div>

              {/* (Secondary Actions Block Removed per user preference) */}
            </div>

            {cartError && (
              <p className="text-red-500 text-sm mt-2">{cartError}</p>
            )}

            {/* Additional Info Links */}
            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-100 text-gray-600 text-sm font-medium">
              <div className="flex items-center gap-3">
                <FiTruck size={18} />
                <span>Estimated Delivery: 4 TO 6 DAYS</span>
              </div>
              <button className="flex items-center gap-3 hover:text-black transition self-start cursor-pointer">
                <FiHelpCircle size={18} /> Ask a Question
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS SECTION */}
      <div className="mt-12 md:mt-20 border-t border-gray-100 pt-8 md:pt-16">
        <NamedSection
          title="You May Also Like"
          productData={recommendedProducts}
          autoplay={false}
        />
      </div>

      {/* Sticky Mobile Action Bar */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 md:hidden transition-transform duration-300 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] ${"translate-y-0"}`}
      >
        <div className="flex flex-row gap-3 w-full mx-auto">
          <button
            onClick={handleAddToCart}
            disabled={isAdding || (currentVariant && !currentVariant.available)}
            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all border
              ${
                currentVariant && !currentVariant.available
                  ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50 hover:text-red-500 hover:border-red-500"
              }
            `}
          >
            {isAdding ? "Adding..." : "Add to Cart"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={currentVariant && !currentVariant.available}
            className={`flex-[1.5] py-2 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-md font-source-sans transition-all border
              ${
                currentVariant && !currentVariant.available
                  ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed"
                  : "bg-primary text-black border-primary hover:bg-red-600 hover:border-red-600"
              }
            `}
          >
            {currentVariant?.price
              ? `Buy at ${formatMoney(currentPrice)}`
              : "Buy Now"}
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      <div
        className={`fixed inset-0 bg-white flex flex-col items-center justify-between pt-16 pb-8 px-4 h-dvh w-full transition-all duration-300 ${
          isLightboxOpen
            ? "z-9999 opacity-100 pointer-events-auto"
            : "-z-50 opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setIsLightboxOpen(false)}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-gray-400 hover:bg-gray-500 rounded-full text-white transition z-10 cursor-pointer shadow-sm"
        >
          <FiX size={24} />
        </button>

        {/* Main Large Image Carousel */}
        <div className="flex-1 w-full max-w-5xl flex items-center justify-center relative mb-6 overflow-hidden">
          <Carousel
            ref={lightboxCarouselRef}
            responsive={mainResponsive}
            infinite={true}
            customLeftArrow={<CustomLeftArrow />}
            customRightArrow={<CustomRightArrow />}
            afterChange={(_prev: number, state: any) => {
              const realIndex =
                (state.currentSlide - 2 + displayImages.length) %
                displayImages.length;
              if (realIndex !== lightboxIndex) {
                setLightboxIndex(realIndex);
              }
            }}
            itemClass="flex items-center justify-center h-full w-full"
            containerClass="h-full w-full"
            sliderClass="h-full"
          >
            {displayImages.map((src: string, index: number) => (
              <div
                className="w-full h-full relative flex items-center justify-center"
                key={index}
              >
                <img
                  src={src}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                  alt={`Enlarged product ${index + 1}`}
                />
              </div>
            ))}
          </Carousel>
        </div>

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <div
            className="h-20 md:h-24 max-w-2xl w-full flex justify-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {displayImages.map((src: string, idx: number) => (
              <div
                key={idx}
                onClick={() => {
                  setLightboxIndex(idx);
                  if (lightboxCarouselRef.current) {
                    lightboxCarouselRef.current.goToSlide(idx + 2);
                  }
                }}
                className={`h-full aspect-3/4 shrink-0 cursor-pointer border-2 transition-all ${
                  idx === lightboxIndex
                    ? "border-black"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  className="w-full h-full object-cover bg-gray-50"
                  alt={`Thumb ${idx + 1}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
