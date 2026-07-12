import React, { useEffect, useMemo, useState } from "react";
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

const normalizeBarcode = (value: any) => {
  return String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, "");
};

const cleanText = (value: any) => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeText = (value: any) => {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[./_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const toTitleCase = (value: any) => {
  return cleanText(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2 && /^[a-z]+$/.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const removeStartToken = (text: string, token: any) => {
  const raw = cleanText(text);
  const cleanToken = cleanText(token);
  if (!raw || !cleanToken) return raw;

  const rawNorm = normalizeText(raw);
  const tokenNorm = normalizeText(cleanToken);

  if (!rawNorm.startsWith(tokenNorm)) return raw;

  const rawWords = raw.split(" ");
  const tokenWordCount = cleanToken.split(" ").filter(Boolean).length;
  return cleanText(rawWords.slice(tokenWordCount).join(" "));
};

const commonColorWords = [
  "black",
  "white",
  "h white",
  "off white",
  "cream",
  "beige",
  "brown",
  "green",
  "b green",
  "blue",
  "sky blue",
  "sea blue",
  "ice blue",
  "navy",
  "grey",
  "gray",
  "d grey",
  "dark grey",
  "dark gray",
  "charcoal",
  "lavender",
  "pink",
  "red",
  "maroon",
  "yellow",
  "mustard",
  "orange",
  "purple",
  "tint",
  "olive",
  "khaki"
];

const removeColorPrefix = (text: string, colorValue: any) => {
  let next = cleanText(text);
  const color = cleanText(colorValue);

  if (color) {
    const colorParts = [
      color,
      color.replace(/\./g, " "),
      color.replace(/\//g, " "),
      color.replace(/-/g, " ")
    ];

    for (const part of colorParts) {
      const before = next;
      next = removeStartToken(next, part);
      if (before !== next) return next;
    }
  }

  for (const colorWord of commonColorWords) {
    const before = next;
    next = removeStartToken(next, colorWord);
    if (before !== next) return next;
  }

  return next;
};

const cleanDisplayTitle = (props: any) => {
  const rawTitle = cleanText(props.title || props.name || props.product_name || props.productName || "Product");
  const brand = cleanText(props.brand || props.brand_name || props.brandName);
  const color = cleanText(props.colour || props.color || props.selectedColour || props.selectedColor || props.selected_colour || props.selected_color);
  const categoryName = cleanText(props.categoryName || props.category_name || "");

  let title = rawTitle
    .replace(/['’]/g, "'")
    .replace(/\bmen's\b/gi, "MENS")
    .replace(/\bwomen's\b/gi, "WOMENS")
    .replace(/\s+/g, " ")
    .trim();

  title = removeStartToken(title, brand);
  title = removeStartToken(title, "MENS");
  title = removeStartToken(title, "MEN");
  title = removeStartToken(title, "WOMENS");
  title = removeStartToken(title, "WOMEN");
  title = removeStartToken(title, "LADIES");
  title = removeStartToken(title, "KIDS");
  title = removeStartToken(title, "BOYS");
  title = removeStartToken(title, "GIRLS");
  title = removeColorPrefix(title, color);

  if (normalizeText(title).length <= 2 && categoryName) title = categoryName;
  if (!title) title = categoryName || rawTitle || "Product";

  return toTitleCase(title);
};

const cleanDisplayBrand = (value: any) => {
  const brand = cleanText(value || "Vandhana");
  return brand.toUpperCase();
};

const formatPrice = (value: any) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
};

const getImageString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.image_url || value.secure_url || value.url || value.imageUrl || "").trim();
};

const getImageType = (value: any) => {
  if (!value || typeof value === "string") return "";
  return String(value.image_type || value.imageType || value.type || "").trim().toLowerCase();
};

const isBadImage = (value: any) => {
  const s = String(value || "").trim().toLowerCase();
  return !s || s === "[object object]" || s.includes("undefined") || s.includes("null") || s.includes("placeholder.svg");
};

const sameImage = (a: any, b: any) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return !!x && !!y && x === y;
};

const getArrayValues = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const extractBarcodeFromImageUrl = (url: any) => {
  const text = decodeURIComponent(String(url || ""));
  const filename = text.split("?")[0].split("/").pop() || text;
  const clean = filename.replace(/\.[a-z0-9]+$/i, "");

  if (clean.includes("__")) {
    const first = normalizeBarcode(clean.split("__")[0]);
    if (first) return first;
  }

  const match = clean.match(/[A-Za-z0-9._-]*\d{5,}[A-Za-z0-9._-]*/);
  return match ? normalizeBarcode(match[0]) : "";
};

const imageMatchesAllowedCodes = (url: string, allowedCodes: Set<string>) => {
  if (!url || isBadImage(url)) return false;
  if (!allowedCodes.size) return true;

  const imageCode = extractBarcodeFromImageUrl(url);
  if (!imageCode) return true;

  return allowedCodes.has(imageCode);
};

const firstValidImage = (values: any[], allowedCodes: Set<string>) => {
  for (const value of values) {
    const image = getImageString(value);
    if (!imageMatchesAllowedCodes(image, allowedCodes)) continue;
    return image;
  }
  return "";
};

const findImageByType = (images: any[], type: string, allowedCodes: Set<string>) => {
  const target = String(type || "").toLowerCase();

  for (const img of images) {
    if (getImageType(img) !== target) continue;
    const image = getImageString(img);
    if (imageMatchesAllowedCodes(image, allowedCodes)) return image;
  }

  return "";
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-[400px] block animate-pulse">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-200"></div>
      <div className="mt-3 min-h-[86px] space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/5"></div>
        <div className="h-6 bg-gray-200 rounded w-4/5"></div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mt-3"></div>
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
    barcode,
    ean_code,
    eanCode,
    barcodes,
    ean_codes,
  } = props;

  const navigate = useNavigate();
  const [frontFailed, setFrontFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);

  const displayTitle = useMemo(() => cleanDisplayTitle(props), [props]);
  const displayBrand = useMemo(() => cleanDisplayBrand(brand || props.brand_name || props.brandName), [brand, props.brand_name, props.brandName]);

  const allowedImageCodes = useMemo(() => {
    const codes = [
      barcode,
      ean_code,
      eanCode,
      ...getArrayValues(barcodes),
      ...getArrayValues(ean_codes),
    ]
      .map(normalizeBarcode)
      .filter(Boolean);

    return new Set(codes);
  }, [barcode, ean_code, eanCode, barcodes, ean_codes]);

  const resolvedImages = useMemo(() => {
    const imageList = Array.isArray(images) ? images : [];

    const typedFront = findImageByType(imageList, "front", allowedImageCodes);
    const typedMain = findImageByType(imageList, "main", allowedImageCodes);
    const typedBack = findImageByType(imageList, "back", allowedImageCodes);

    const front =
      firstValidImage(
        [
          frontImageUrl,
          front_image_url,
          typedFront,
          mainImageUrl,
          main_image_url,
          typedMain,
          imageUrl,
          image_url,
        ],
        allowedImageCodes
      ) || "/placeholder.svg";

    const back = firstValidImage([backImageUrl, back_image_url, typedBack], allowedImageCodes);

    return {
      front,
      back: back && !sameImage(back, front) ? back : "",
    };
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
    allowedImageCodes,
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

  const finalPrice = Number(price || 0);
  const finalOriginalPrice = Number(originalPrice || props.original_price || props.mrp || 0);
  const discount = finalOriginalPrice && finalOriginalPrice > finalPrice ? Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100) : 0;
  const frontImg = frontFailed ? "/placeholder.svg" : resolvedImages.front || "/placeholder.svg";
  const backImg = !backFailed && resolvedImages.back && !sameImage(resolvedImages.back, frontImg) ? resolvedImages.back : "";
  const hasBackImage = Boolean(backImg);

  useEffect(() => {
    setFrontFailed(false);
    setBackFailed(false);
  }, [resolvedImages.front, resolvedImages.back, finalVariantId, id]);

  useEffect(() => {
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
    <Link to={`/product/${routeId}`} className={`w-full max-w-[400px] cursor-pointer block overflow-hidden ${hasBackImage ? "group" : ""}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
        {(isSale || discount > 0) && (
          <div className="absolute top-0 left-3 z-20 bg-primary text-black px-3 py-0.5 h-[22px] flex items-center justify-center rounded-b-sm">
            <span className="font-big-shoulders font-bold text-[0.82rem] leading-none uppercase">Sale</span>
          </div>
        )}

        <img
          src={frontImg}
          alt={displayTitle || title}
          loading="lazy"
          onError={() => setFrontFailed(true)}
          className={`h-full w-full object-cover object-top transition-all duration-500 relative z-10 ${
            hasBackImage ? "group-hover:opacity-0 group-hover:scale-105" : ""
          }`}
        />

        {hasBackImage ? (
          <img
            src={backImg}
            alt={`${displayTitle || title} back`}
            loading="lazy"
            onError={() => setBackFailed(true)}
            className="h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105 absolute inset-0 opacity-0 group-hover:opacity-100 z-10"
          />
        ) : null}

        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={isUpdatingWishlist}
          className="cursor-pointer hover:bg-gray-100 absolute bottom-3 right-3 z-40 bg-white rounded-full p-2.5 shadow-md transition-transform hover:scale-110 disabled:opacity-60"
        >
          <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : "text-black"} />
        </button>
      </div>

      <div className="mt-3 min-h-[86px] flex flex-col">
        <p className="text-[0.72rem] md:text-[0.78rem] font-extrabold tracking-wide text-gray-500 font-poppins uppercase truncate leading-tight">
          {displayBrand}
        </p>

        <h3
          aria-label={displayTitle}
          title={displayTitle}
          className="mt-1 text-[1.1rem] md:text-[1.2rem] font-bold tracking-tight text-black font-big-shoulders uppercase leading-[1.05] line-clamp-2 min-h-[2.35rem]"
        >
          {displayTitle}
        </h3>

        <div className="mt-auto pt-2 flex items-center font-source-sans gap-2 min-h-[32px] overflow-hidden">
          <span className="text-[1.15rem] md:text-[1.22rem] font-extrabold text-black whitespace-nowrap">₹{formatPrice(finalPrice)}</span>

          {finalOriginalPrice > finalPrice && (
            <>
              <span className="text-[0.9rem] md:text-[1rem] font-medium text-gray-400 line-through whitespace-nowrap">₹{formatPrice(finalOriginalPrice)}</span>
              <span className="text-[0.72rem] md:text-[0.78rem] font-extrabold text-green-600 tracking-tight whitespace-nowrap">{discount}% OFF</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};