import React, { useState } from "react";
import { Link } from "react-router";
import type { Product } from "../Models/Product";
import { Heart } from "lucide-react";

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="max-w-[400px] block animate-pulse">
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-gray-200"></div>
      <div className="mt-3 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="flex gap-2 items-center mt-2">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
};

export const ProductCard: React.FC<Product> = ({
  id,
  images,
  title,
  description,
  price,
  originalPrice,
  isSale,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  return (
    <Link
      to={`/product/${id}`}
      className="max-w-[400px] group cursor-pointer block"
    >
      {/* Image Container */}
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-gray-100">
        {/* Skeleton Background while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse z-0" />
        )}

        {/* Sale Badge */}
        {isSale && (
          <div className="absolute top-3 left-3 z-20 bg-primary text-black px-2 py-0.5 h-[18px] flex items-center justify-center rounded-xs">
            <span className="font-big-shoulders font-bold text-[0.8rem] uppercase">
              Sale
            </span>
          </div>
        )}

        {/* Product Image */}
        <img
          src={images[0]}
          alt={title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 relative z-10 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          } ${images.length > 1 ? "group-hover:opacity-0" : ""}`}
        />
        {images.length > 1 && (
          <img
            src={images[1]}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 absolute top-0 left-0 opacity-0 group-hover:opacity-100 z-10"
          />
        )}
        <button className="cursor-pointer hover:bg-gray-100 absolute bottom-3 right-3 z-40 bg-white rounded-full p-2 shadow-sm transition-transform hover:scale-110">
          <Heart className="text-black" size={18} />
        </button>
      </div>

      {/* Product Info */}
      <div className="mt-2">
        <h3
          aria-label={title}
          className="text-[1.2rem] font-bold tracking-tight text-black font-big-shoulders capitalize truncate"
        >
          {title}
        </h3>

        <p
          aria-label={description}
          className="text-gray-500 max-w-[96%] font-poppins text-[0.8rem] leading-relaxed line-clamp-1"
        >
          {description}
        </p>

        <div className="flex items-center font-source-sans gap-2 mt-0.5">
          <span className="text-[1.2rem] font-bold text-black">₹{price}</span>
          {originalPrice && price < originalPrice && (
            <>
              <span className="text-[1rem] font-medium text-gray-400 line-through">
                ₹{originalPrice}
              </span>
              <span className="text-[13px] font-bold text-green-600 tracking-tight">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};
