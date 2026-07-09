import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Product } from "../Models/Product";
import { Heart } from "lucide-react";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user") || null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toPositiveNumber = (value: any) => {
  const parsed = Number(String(value || "").trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getWishlistKey = (userId: number) => `wishlist_variant_ids_${userId}`;

const readWishlistIds = (userId: number): number[] => {
  try {
    const raw = localStorage.getItem(getWishlistKey(userId)) || localStorage.getItem(`wishlist_product_ids_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

const writeWishlistIds = (userId: number, ids: number[]) => {
  localStorage.setItem(getWishlistKey(userId), JSON.stringify(ids));
  localStorage.setItem(`wishlist_product_ids_${userId}`, JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-updated"));
};

const getImageString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.image_url || value.secure_url || value.url || "").trim();
};

const isBadImage = (value: any) => {
  const s = String(value || "").trim().toLowerCase();
  return !s || s === "[object object]" || s.includes("undefined") || s.includes("null") || s.includes("placeholder.svg");
};

const uniqueImages = (values: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  values.forEach((value) => {
    const image = getImageString(value);
    if (isBadImage(image)) return;
    const key = image.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(image);
  });

  return out;
};

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

export const ProductCard: React.FC<Product> = (props: any) => {
  const {
    id,
    productId,
    product_id,
    variantId,
    variant_id,
    primaryVariantId,
    primary_variant_id,
    images,
    title,
    description,
    brand,
    price,
    originalPrice,
    isSale,
    frontImageUrl,
    front_image_url,
    backImageUrl,
    back_image_url,
    mainImageUrl,
    main_image_url,
    imageUrl,
    image_url,
  } = props;

  const navigate = useNavigate();
  const [frontFailed, setFrontFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);

  const resolvedImages = useMemo(() => {
    const imageList = Array.isArray(images) ? images : [];
    const allImages = uniqueImages(imageList);

    const frontCandidates = uniqueImages([
      frontImageUrl,
      front_image_url,
      imageUrl,
      image_url,
      mainImageUrl,
      main_image_url,
      allImages[0],
    ]);

    const front = frontCandidates[0] || "/placeholder.svg";

    const backCandidates = uniqueImages([
      backImageUrl,
      back_image_url,
      allImages[1],
      ...allImages.slice(1),
    ]).filter((item) => item !== front);

    const back = backCandidates[0] || "";

    return { front, back };
  }, [
    images,
    frontImageUrl,
    front_image_url,
    backImageUrl,
    back_image_url,
    mainImageUrl,
    main_image_url,
    imageUrl,
    image_url,
  ]);

  const finalVariantId = variantId || variant_id || primaryVariantId || primary_variant_id;

  const wishlistVariantId = useMemo(() => {
    return toPositiveNumber(finalVariantId) || toPositiveNumber(id);
  }, [finalVariantId, id]);

  const parentProductId = useMemo(() => {
    return toPositiveNumber(productId || product_id) || toPositiveNumber(id);
  }, [productId, product_id, id]);

  const routeId = useMemo(() => {
    return encodeURIComponent(String(finalVariantId || id));
  }, [finalVariantId, id]);

  const discount = originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const frontImg = frontFailed ? "/placeholder.svg" : resolvedImages.front || "/placeholder.svg";
  const backImg = !backFailed && resolvedImages.back && resolvedImages.back !== frontImg ? resolvedImages.back : "";
  const hasBackImage = Boolean(backImg);

  React.useEffect(() => {
    setFrontFailed(false);
    setBackFailed(false);
  }, [resolvedImages.front, resolvedImages.back]);

  React.useEffect(() => {
    const syncWishlistState = () => {
      const user = getStoredUser();
      const userId = Number(user?.id || 0);
      if (!userId || !wishlistVariantId) {
        setIsWishlisted(false);
        return;
      }
      const ids = readWishlistIds(userId);
      setIsWishlisted(ids.includes(wishlistVariantId));
    };

    syncWishlistState();
    window.addEventListener("wishlist-updated", syncWishlistState);

    return () => {
      window.removeEventListener("wishlist-updated", syncWishlistState);
    };
  }, [wishlistVariantId]);

  const handleWishlistToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return;
    }

    if (!wishlistVariantId) {
      alert("This product is not linked to a backend variant id yet.");
      return;
    }

    if (isUpdatingWishlist) return;

    setIsUpdatingWishlist(true);

    try {
      if (isWishlisted) {
        const res = await fetch(`${API_BASE}/api/wishlist`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            product_id: wishlistVariantId,
            variant_id: wishlistVariantId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Unable to remove from wishlist");
        }

        const ids = readWishlistIds(userId).filter((item) => item !== wishlistVariantId);
        writeWishlistIds(userId, ids);
        setIsWishlisted(false);
      } else {
        const res = await fetch(`${API_BASE}/api/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            product_id: wishlistVariantId,
            variant_id: wishlistVariantId,
            actual_product_id: parentProductId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Unable to add to wishlist");
        }

        const ids = Array.from(new Set([...readWishlistIds(userId), wishlistVariantId]));
        writeWishlistIds(userId, ids);
        setIsWishlisted(true);
      }
    } catch (err: any) {
      alert(err?.message || "Wishlist update failed");
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  return (
    <Link to={`/product/${routeId}`} className={`max-w-[400px] cursor-pointer block ${hasBackImage ? "group" : ""}`}>
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-gray-100">
        {(isSale || discount > 0) && (
          <div className="absolute top-3 left-3 z-20 bg-primary text-black px-2 py-0.5 h-[18px] flex items-center justify-center rounded-xs">
            <span className="font-big-shoulders font-bold text-[0.8rem] uppercase">Sale</span>
          </div>
        )}

        <img
          src={frontImg}
          alt={title}
          loading="lazy"
          onError={() => setFrontFailed(true)}
          className={`h-full w-full object-cover object-top transition-all duration-500 relative z-10 ${
            hasBackImage ? "group-hover:opacity-0 group-hover:scale-105" : ""
          }`}
        />

        {hasBackImage ? (
          <img
            src={backImg}
            alt={`${title} back`}
            loading="lazy"
            onError={() => setBackFailed(true)}
            className="h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105 absolute inset-0 opacity-0 group-hover:opacity-100 z-10"
          />
        ) : null}

        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={isUpdatingWishlist}
          className="cursor-pointer hover:bg-gray-100 absolute bottom-3 right-3 z-40 bg-white rounded-full p-2 shadow-sm transition-transform hover:scale-110 disabled:opacity-60"
        >
          <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : "text-black"} />
        </button>
      </div>

      <div className="mt-2">
        {brand ? (
          <p className="text-[0.72rem] font-bold tracking-wide text-gray-500 font-poppins uppercase truncate">{brand}</p>
        ) : null}

        <h3 aria-label={title} className="text-[1.2rem] font-bold tracking-tight text-black font-big-shoulders capitalize truncate">
          {title}
        </h3>

        <p aria-label={description} className="text-gray-500 max-w-[96%] font-poppins text-[0.8rem] leading-relaxed line-clamp-1">
          {description}
        </p>

        <div className="flex items-center font-source-sans gap-2 mt-0.5">
          <span className="text-[1.2rem] font-bold text-black">₹{price}</span>
          {originalPrice && price < originalPrice && (
            <>
              <span className="text-[1rem] font-medium text-gray-400 line-through">₹{originalPrice}</span>
              <span className="text-[13px] font-bold text-green-600 tracking-tight">{discount}% OFF</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};