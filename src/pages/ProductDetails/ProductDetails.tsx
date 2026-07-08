import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import categoriesData from "../../Data/categories.json";
import type { Category } from "../../Models/Category";
import type { Product } from "../../Models/Product";
import CarouselModule from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import NamedSection from "../../components/NamedSection";
import { fetchProductById, fetchProductsByGender } from "../../services/productsApi";
import { addToCart } from "../../services/cartApi";
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

const Carousel = (CarouselModule as any).default || CarouselModule;
const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type OptionGroup = {
  name: string;
  values: string[];
};

type ProductVariantOption = {
  id: string | number;
  variant_id: string | number;
  product_id?: string | number;
  size: string;
  colour: string;
  color: string;
  barcode?: string;
  ean_code?: string;
  mrp: number;
  base_sale_price?: number;
  original_sale_price?: number;
  sale_price: number;
  price: number;
  selling_price?: number;
  discounted_price?: number;
  mahaveer_price?: number;
  cost_price?: number;
  b2c_discount_pct?: number;
  b2b_discount_pct?: number;
  original_price_b2c: number;
  final_price_b2c: number;
  original_price_b2b?: number;
  final_price_b2b?: number;
  on_hand?: number;
  reserved?: number;
  available_qty?: number;
  in_stock?: boolean;
  image_url?: string;
  imageUrl?: string;
  front_image_url?: string;
  frontImageUrl?: string;
  back_image_url?: string;
  backImageUrl?: string;
  main_image_url?: string;
  mainImageUrl?: string;
  images?: any[];
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

const getWishlistKey = (userId: number) => `wishlist_product_ids_${userId}`;

const readWishlistIds = (userId: number): number[] => {
  try {
    const raw = localStorage.getItem(getWishlistKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeWishlistIds = (userId: number, ids: number[]) => {
  localStorage.setItem(getWishlistKey(userId), JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-updated"));
};

const getNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clampDiscount = (value: any) => {
  const n = getNumber(value, 0);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const firstPositiveDiscount = (...values: any[]) => {
  for (const value of values) {
    const n = clampDiscount(value);
    if (n > 0) return n;
  }
  return 0;
};

const calculateDiscountedPrice = (price: any, discount: any, fallback = 0) => {
  const base = getNumber(price, fallback);
  const pct = clampDiscount(discount);
  if (!base) return getNumber(fallback, 0);
  if (!pct) return base;
  return Math.round((base - (base * pct) / 100 + Number.EPSILON) * 100) / 100;
};

const getString = (value: any) => String(value || "").trim();

const isGroupedValue = (value: any) => {
  const s = getString(value);
  if (!s) return false;
  if (s.includes(",")) return true;
  if (s.split(/\s+/).length > 4) return true;
  return false;
};

const cleanSingleValue = (value: any) => {
  const s = getString(value);
  if (!s) return "";
  if (isGroupedValue(s)) return "";
  return s;
};

const sameValue = (a: any, b: any) =>
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

const getVariantColor = (variant?: ProductVariantOption | null) =>
  cleanSingleValue(variant?.colour || variant?.color || "");

const getBackendProductId = (product: Product | null) => {
  const p: any = product || {};
  const value = p.productId || p.product_id || p.id || "";
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getVariantIdValue = (variant?: ProductVariantOption | null, product?: Product | null) => {
  const p: any = product || {};
  const value =
    variant?.variant_id ||
    variant?.id ||
    p.variantId ||
    p.variant_id ||
    p.primaryVariantId ||
    p.primary_variant_id ||
    p.id ||
    "";
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getImageString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.image_url || value.secure_url || value.url || "").trim();
};

const isBadImage = (value: any) => {
  const s = String(value || "").trim().toLowerCase();
  return !s || s === "[object object]" || s.includes("undefined") || s.includes("null");
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

const parseImages = (value: any) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
};

const normalizeImageType = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const imageByType = (images: any[], ...types: string[]) => {
  const targets = types.map(normalizeImageType).filter(Boolean);
  const found = images.find((item: any) => {
    const imageType = normalizeImageType(item?.image_type || item?.type || item?.label || item?.name || item?.view || item?.position);
    return targets.some((target) => imageType.includes(target));
  });
  return getImageString(found);
};

const firstDifferentImage = (images: any[], front: string) => {
  const frontKey = String(front || "").trim().toLowerCase();
  return getImageString(
    images.find((image) => {
      const value = getImageString(image);
      return value && value.toLowerCase() !== frontKey;
    }),
  );
};

const imagePairFromSource = (source: any) => {
  const rawImages = parseImages(source?.images);

  const front = getImageString(
    source?.front_image_url ||
      source?.frontImageUrl ||
      source?.front_url ||
      source?.frontUrl ||
      source?.front_image ||
      source?.frontImage ||
      imageByType(rawImages, "front", "primary") ||
      source?.image_url ||
      source?.imageUrl ||
      source?.main_image_url ||
      source?.mainImageUrl ||
      imageByType(rawImages, "main", "default") ||
      rawImages[0],
  );

  const back = getImageString(
    source?.back_image_url ||
      source?.backImageUrl ||
      source?.back_url ||
      source?.backUrl ||
      source?.back_image ||
      source?.backImage ||
      source?.rear_image_url ||
      source?.rearImageUrl ||
      source?.secondary_image_url ||
      source?.secondaryImageUrl ||
      source?.hover_image_url ||
      source?.hoverImageUrl ||
      source?.image2 ||
      source?.image_2 ||
      source?.second_image_url ||
      source?.secondImageUrl ||
      imageByType(rawImages, "back", "rear", "secondary", "hover", "second", "alternate") ||
      rawImages[1] ||
      firstDifferentImage(rawImages, front),
  );

  return uniqueImages([front, back]).slice(0, 2);
};

const imageListFromVariant = (variant?: ProductVariantOption | null) => {
  if (!variant) return [];
  return imagePairFromSource(variant);
};

const productFallbackImages = (product: Product | null) => {
  const p: any = product || {};
  return imagePairFromSource(p);
};

const normalizeVariant = (item: any, product: any): ProductVariantOption => {
  const originalB2c = getNumber(
    item?.original_price_b2c ??
      item?.b2c_original_price ??
      item?.mrp ??
      item?.original_price ??
      product?.original_price_b2c ??
      product?.originalPrice ??
      product?.mrp ??
      product?.original_price ??
      product?.price,
    0,
  );

  const directFinalB2c = getNumber(
    item?.final_price_b2c ??
      item?.b2c_final_price ??
      item?.sale_price ??
      item?.price ??
      item?.selling_price ??
      item?.discounted_price ??
      item?.mahaveer_price ??
      product?.final_price_b2c ??
      product?.salePrice ??
      product?.sale_price ??
      product?.price,
    originalB2c,
  );

  const b2cDiscount = firstPositiveDiscount(
    item?.b2c_discount_pct,
    item?.discount_b2c,
    item?.b2c_discount,
    item?.discount_percentage,
    item?.discount_percent,
    item?.discount,
    product?.b2c_discount_pct,
    product?.discount_b2c,
    product?.b2c_discount,
    product?.discount_percentage,
    product?.discount_percent,
    product?.discount,
  );

  const b2bDiscount = firstPositiveDiscount(
    item?.b2b_discount_pct,
    item?.discount_b2b,
    item?.b2b_discount,
    item?.discount_percentage_b2b,
    product?.b2b_discount_pct,
    product?.discount_b2b,
    product?.b2b_discount,
    product?.discount_percentage_b2b,
  );

  const mrp = originalB2c;
  const finalB2c = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directFinalB2c) : directFinalB2c;
  const originalB2b = getNumber(item?.original_price_b2b ?? item?.b2b_original_price ?? item?.cost_price ?? product?.original_price_b2b ?? product?.cost_price, originalB2c);
  const finalB2b = b2bDiscount > 0 && originalB2b > 0 ? calculateDiscountedPrice(originalB2b, b2bDiscount, originalB2b) : getNumber(item?.final_price_b2b ?? item?.b2b_final_price ?? item?.cost_price ?? product?.final_price_b2b, finalB2c);
  const size = cleanSingleValue(item?.size || item?.selected_size || product?.size);
  const colour = cleanSingleValue(item?.colour || item?.color || item?.selected_color || product?.colour || product?.color);

  const variantImages = imagePairFromSource(item);

  return {
    id: item?.id || item?.variant_id || item?.variantId || product?.variantId || product?.variant_id || product?.id || "",
    variant_id: item?.variant_id || item?.variantId || item?.id || product?.variantId || product?.variant_id || product?.id || "",
    product_id: item?.product_id || item?.productId || product?.productId || product?.product_id || product?.id,
    size,
    colour,
    color: colour,
    barcode: getString(item?.barcode || item?.ean_code || product?.barcode || product?.ean_code),
    ean_code: getString(item?.ean_code || item?.barcode || product?.ean_code || product?.barcode),
    mrp,
    base_sale_price: getNumber(item?.base_sale_price ?? item?.original_sale_price ?? item?.sale_price, finalB2c),
    original_sale_price: getNumber(item?.original_sale_price ?? item?.base_sale_price ?? item?.sale_price, finalB2c),
    sale_price: finalB2c,
    price: getNumber(item?.price ?? item?.sale_price ?? item?.final_price_b2c, finalB2c),
    selling_price: getNumber(item?.selling_price ?? item?.sale_price ?? item?.final_price_b2c, finalB2c),
    discounted_price: getNumber(item?.discounted_price ?? item?.sale_price ?? item?.final_price_b2c, finalB2c),
    mahaveer_price: getNumber(item?.mahaveer_price ?? item?.sale_price ?? item?.final_price_b2c, finalB2c),
    cost_price: getNumber(item?.cost_price ?? product?.cost_price, 0),
    b2c_discount_pct: b2cDiscount,
    b2b_discount_pct: b2bDiscount,
    original_price_b2c: originalB2c,
    final_price_b2c: finalB2c,
    original_price_b2b: originalB2b,
    final_price_b2b: finalB2b,
    on_hand: getNumber(item?.on_hand ?? product?.on_hand ?? product?.onHand, 0),
    reserved: getNumber(item?.reserved ?? product?.reserved, 0),
    available_qty: getNumber(item?.available_qty ?? item?.on_hand ?? product?.available_qty ?? product?.onHand, 0),
    in_stock: Boolean(item?.in_stock ?? true),
    image_url: variantImages[0] || item?.image_url || item?.imageUrl || "",
    imageUrl: variantImages[0] || item?.imageUrl || item?.image_url || "",
    front_image_url: variantImages[0] || item?.front_image_url || item?.frontImageUrl || "",
    frontImageUrl: variantImages[0] || item?.frontImageUrl || item?.front_image_url || "",
    back_image_url: variantImages[1] || item?.back_image_url || item?.backImageUrl || "",
    backImageUrl: variantImages[1] || item?.backImageUrl || item?.back_image_url || "",
    main_image_url: variantImages[0] || item?.main_image_url || item?.mainImageUrl || "",
    mainImageUrl: variantImages[0] || item?.mainImageUrl || item?.main_image_url || "",
    images: variantImages.length ? variantImages : parseImages(item?.images),
  };
};

const isValidVariantOption = (variant: ProductVariantOption) => {
  const hasSize = !!cleanSingleValue(variant.size);
  const hasColor = !!cleanSingleValue(variant.colour || variant.color);
  const hasId = !!getString(variant.variant_id || variant.id || variant.barcode || variant.ean_code);
  return hasId && (hasSize || hasColor);
};

const getProductVariants = (product: Product | null): ProductVariantOption[] => {
  if (!product) return [];
  const p: any = product;
  const rawVariants = Array.isArray(p.variants) ? p.variants : [];
  const normalized: ProductVariantOption[] = rawVariants.length ? rawVariants.map((item: any) => normalizeVariant(item, p)) : [normalizeVariant(p, p)];
  const cleanVariants = normalized.filter(isValidVariantOption);
  return cleanVariants.length ? cleanVariants : normalized.filter((variant: ProductVariantOption) => getString(variant.variant_id || variant.id));
};

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  values.forEach((value) => {
    const clean = cleanSingleValue(value);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  });

  return out;
};

const sortVariantValues = (values: string[]) => {
  return uniqueValues(values).sort((a, b) => {
    const na = parseFloat(String(a).replace(/[^\d.]/g, ""));
    const nb = parseFloat(String(b).replace(/[^\d.]/g, ""));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
};

const findExactVariant = (
  variants: ProductVariantOption[],
  selectedSize: string,
  selectedColor: string,
) => {
  if (!variants.length) return null;

  return (
    variants.find((variant: ProductVariantOption) => {
      const sizeOk = selectedSize ? sameValue(variant.size, selectedSize) : true;
      const colorOk = selectedColor ? sameValue(getVariantColor(variant), selectedColor) : true;
      return sizeOk && colorOk;
    }) || null
  );
};

const findVariantByColor = (variants: ProductVariantOption[], selectedColor: string) => {
  if (!selectedColor) return null;
  return variants.find((variant: ProductVariantOption) => sameValue(getVariantColor(variant), selectedColor)) || null;
};

const findVariantBySize = (variants: ProductVariantOption[], selectedSize: string) => {
  if (!selectedSize) return null;
  return variants.find((variant: ProductVariantOption) => sameValue(variant.size, selectedSize)) || null;
};

const findPriceVariant = (
  variants: ProductVariantOption[],
  selectedSize: string,
  selectedColor: string,
) => {
  if (!variants.length) return null;
  const exact = findExactVariant(variants, selectedSize, selectedColor);
  if (exact) return exact;
  const bySize = findVariantBySize(variants, selectedSize);
  if (bySize) return bySize;
  const byColor = findVariantByColor(variants, selectedColor);
  if (byColor) return byColor;
  return variants[0];
};

const findImageVariant = (
  variants: ProductVariantOption[],
  selectedSize: string,
  selectedColor: string,
) => {
  if (!variants.length) return null;
  const exact = findExactVariant(variants, selectedSize, selectedColor);
  if (exact) return exact;
  const byColor = findVariantByColor(variants, selectedColor);
  if (byColor) return byColor;
  const bySize = findVariantBySize(variants, selectedSize);
  if (bySize) return bySize;
  return variants[0];
};

const getVariantStockCount = (variant?: ProductVariantOption | null) => {
  if (!variant) return 0;
  return getNumber(variant.available_qty, 0) || getNumber(variant.on_hand, 0) || 0;
};

const productIdentityKeys = (product: any) => {
  const keys = [
    product?.productId,
    product?.product_id,
    product?.id,
    product?.barcode,
    product?.ean_code,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const titleKey = `${String(product?.brand || "").trim().toLowerCase()}|${String(product?.title || product?.name || product?.product_name || "").trim().toLowerCase()}`;
  if (titleKey !== "|") keys.push(titleKey);

  return keys;
};

const hasSameProductIdentity = (a: any, b: any) => {
  const aKeys = new Set(productIdentityKeys(a));
  return productIdentityKeys(b).some((key) => aKeys.has(key));
};

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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const mainCarouselRef = useRef<any>(null);
  const lightboxCarouselRef = useRef<any>(null);
  const actionContainerRef = useRef<HTMLDivElement>(null);
  const desktopThumbContainerRef = useRef<HTMLDivElement>(null);
  const mobileThumbCarouselRef = useRef<any>(null);

  const backendProductId = useMemo(() => getBackendProductId(product), [product]);
  const allVariantOptions = useMemo(() => getProductVariants(product), [product]);
  const availableVariantOptions = useMemo(
    () => allVariantOptions.filter((variant: ProductVariantOption) => getVariantStockCount(variant) > 0),
    [allVariantOptions],
  );
  const variantOptions = availableVariantOptions.length ? availableVariantOptions : allVariantOptions;
  const selectedSize = selectedOptions["Size"] || "";
  const selectedColor = selectedOptions["Color"] || "";

  const exactSelectedVariant = useMemo(
    () => findExactVariant(variantOptions, selectedSize, selectedColor),
    [variantOptions, selectedSize, selectedColor],
  );

  const priceVariant = useMemo(
    () => findPriceVariant(variantOptions, selectedSize, selectedColor),
    [variantOptions, selectedSize, selectedColor],
  );

  const imageVariant = useMemo(
    () => findImageVariant(variantOptions, selectedSize, selectedColor),
    [variantOptions, selectedSize, selectedColor],
  );

  const colorValues = useMemo(
    () => sortVariantValues(variantOptions.map((variant: ProductVariantOption) => getVariantColor(variant))),
    [variantOptions],
  );

  const sizeValues = useMemo(() => {
    const filtered = selectedColor
      ? variantOptions.filter((variant: ProductVariantOption) => sameValue(getVariantColor(variant), selectedColor))
      : variantOptions;

    return sortVariantValues(filtered.map((variant: ProductVariantOption) => cleanSingleValue(variant.size)));
  }, [variantOptions, selectedColor]);

  useEffect(() => {
    if (desktopThumbContainerRef.current) {
      const activeThumb = desktopThumbContainerRef.current.children[selectedIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    if (mobileThumbCarouselRef.current) {
      mobileThumbCarouselRef.current.goToSlide(selectedIndex);
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (imageVariant?.variant_id) {
      setSelectedIndex(0);
      setLightboxIndex(0);

      setTimeout(() => {
        if (mainCarouselRef.current) {
          mainCarouselRef.current.goToSlide(2);
        }
        if (mobileThumbCarouselRef.current) {
          mobileThumbCarouselRef.current.goToSlide(0);
        }
      }, 0);
    }
  }, [imageVariant?.variant_id]);

  useEffect(() => {
    let alive = true;

    const loadProduct = async () => {
      if (!id) {
        setLoadingProduct(false);
        setProduct(null);
        return;
      }

      setLoadingProduct(true);
      setLoadError("");

      try {
        const foundProduct = await fetchProductById(id, 3);

        if (!alive) return;

        if (!foundProduct) {
          setProduct(null);
          setLoadError("Product not found");
          return;
        }

        const allVariants = getProductVariants(foundProduct);
        const availableVariants = allVariants.filter((variant: ProductVariantOption) => getVariantStockCount(variant) > 0);
        const variants = availableVariants.length ? availableVariants : allVariants;
        const firstVariant = variants[0];
        const initialOptions: Record<string, string> = {};

        if (firstVariant?.colour || firstVariant?.color) {
          initialOptions["Color"] = getVariantColor(firstVariant);
        } else if (foundProduct.colors?.length) {
          initialOptions["Color"] = cleanSingleValue(foundProduct.colors[0]);
        }

        if (firstVariant?.size) {
          initialOptions["Size"] = cleanSingleValue(firstVariant.size);
        } else if (foundProduct.sizes?.length) {
          initialOptions["Size"] = cleanSingleValue(foundProduct.sizes[0]);
        }

        setProduct(foundProduct);
        setSelectedOptions(initialOptions);
        setSelectedIndex(0);
        setLightboxIndex(0);
        setQuantity(1);

        try {
          const stored: string[] = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
          const currentId = String((foundProduct as any).variantId || (foundProduct as any).variant_id || (foundProduct as any).productId || (foundProduct as any).product_id || foundProduct.id);
          const updated = [
            currentId,
            ...stored.filter((item: string) => item !== currentId),
          ].slice(0, 20);
          localStorage.setItem("recentlyViewed", JSON.stringify(updated));
        } catch {}
      } catch (err: any) {
        if (alive) {
          setProduct(null);
          setLoadError(err?.message || "Unable to load product");
        }
      } finally {
        if (alive) setLoadingProduct(false);
      }
    };

    void loadProduct();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!variantOptions.length) return;

    setSelectedOptions((prev) => {
      const currentColor = prev["Color"] || "";
      const currentSize = prev["Size"] || "";
      const exact = findExactVariant(variantOptions, currentSize, currentColor);

      if (exact) return prev;

      const colorMatch = currentColor
        ? variantOptions.find((variant: ProductVariantOption) => sameValue(getVariantColor(variant), currentColor))
        : null;

      const sizeMatch = currentSize
        ? variantOptions.find((variant: ProductVariantOption) => sameValue(variant.size, currentSize))
        : null;

      const nextVariant = colorMatch || sizeMatch || variantOptions[0];
      const nextColor = getVariantColor(nextVariant);
      const nextSize = cleanSingleValue(nextVariant?.size || "");

      const next: Record<string, string> = { ...prev };

      if (nextColor) next["Color"] = nextColor;
      else delete next["Color"];

      if (nextSize) next["Size"] = nextSize;
      else delete next["Size"];

      if (sameValue(currentColor, next["Color"]) && sameValue(currentSize, next["Size"])) return prev;

      return next;
    });
  }, [variantOptions]);

  useEffect(() => {
    if (!selectedColor || !sizeValues.length) return;

    setSelectedOptions((prev) => {
      const currentSize = prev["Size"] || "";
      if (sizeValues.some((size) => sameValue(size, currentSize))) return prev;

      return {
        ...prev,
        Size: sizeValues[0],
      };
    });
  }, [selectedColor, sizeValues]);

  useEffect(() => {
    setQuantity(1);
  }, [priceVariant?.variant_id]);

  useEffect(() => {
    let alive = true;

    const loadRecommended = async () => {
      if (!product) {
        setRecommendedProducts([]);
        return;
      }

      try {
        const allProducts = await fetchProductsByGender(product.gender, 3);
        if (!alive) return;

        const categories = categoriesData as Category[];
        const productCategories = [
          product.gender.toLowerCase(),
          categories.find((c: Category) => c.id === product.categoryId)?.name?.toLowerCase() || "",
        ];

        const validGenders = categories
          ?.filter((c: Category) => c.level === 0)
          .map((c: Category) => c.name.toLowerCase());

        const mainGender = productCategories.find((c) => validGenders.includes(c));
        const seen = new Set<string>();

        const recommended = allProducts
          .filter((p) => !hasSameProductIdentity(product, p))
          .map((p) => {
            const targetCategories = [
              p.gender.toLowerCase(),
              categories.find((c: Category) => c.id === p.categoryId)?.name?.toLowerCase() || "",
            ];

            const hasSameGender = mainGender ? targetCategories.includes(mainGender) : true;
            const matchScore = targetCategories.filter((c) => productCategories.includes(c)).length;

            return { product: p, matchScore, hasSameGender };
          })
          .filter((item) => item.hasSameGender && item.matchScore > 0)
          .filter((item) => {
            const key = productIdentityKeys(item.product)[0] || String(item.product.id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10)
          .map((item) => item.product);

        setRecommendedProducts(recommended);
      } catch {
        if (alive) setRecommendedProducts([]);
      }
    };

    void loadRecommended();

    return () => {
      alive = false;
    };
  }, [product]);

  useEffect(() => {
    const syncWishlistState = () => {
      const user = getStoredUser();
      const userId = Number(user?.id || 0);

      if (!userId || !backendProductId) {
        setIsWishlisted(false);
        return;
      }

      const ids = readWishlistIds(userId);
      setIsWishlisted(ids.includes(backendProductId));
    };

    syncWishlistState();
    window.addEventListener("wishlist-updated", syncWishlistState);

    return () => {
      window.removeEventListener("wishlist-updated", syncWishlistState);
    };
  }, [backendProductId]);

  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <p className="text-gray-500">{loadError || "Unable to load this product."}</p>
        <button
          onClick={() => navigate("/collections")}
          className="px-8 py-3 bg-primary text-black font-bold uppercase text-sm"
        >
          Back to collections
        </button>
      </div>
    );
  }

  const availableStock = getVariantStockCount(exactSelectedVariant || priceVariant);
  const currentPrice = getNumber(priceVariant?.final_price_b2c ?? priceVariant?.sale_price ?? product.price);
  const currentCompareAtPrice = getNumber(priceVariant?.original_price_b2c ?? priceVariant?.mrp ?? product.originalPrice ?? product.price, currentPrice);
  const currentVariant = {
    available: availableStock > 0,
    price: currentPrice,
  };

  const formatMoney = (val: number) =>
    `₹${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const selectedVariantImages = imageListFromVariant(imageVariant);
  const fallbackImages = productFallbackImages(product);
  const displayImages = uniqueImages([
    ...selectedVariantImages,
    ...(selectedVariantImages.length ? [] : fallbackImages),
  ]);

  const finalDisplayImages = displayImages.length ? displayImages : ["/placeholder.svg"];

  const options_with_values: OptionGroup[] = [];

  if (colorValues.length > 0) {
    options_with_values.push({ name: "Color", values: colorValues });
  }

  if (sizeValues.length > 0) {
    options_with_values.push({ name: "Size", values: sizeValues });
  }

  const enhancedProduct = {
    ...product,
    options_with_values,
  };

  const handleOptionChange = (name: string, val: string) => {
    setCartError("");
    setCartMessage("");

    const cleanVal = cleanSingleValue(val);

    if (!cleanVal) return;

    setSelectedOptions((prev) => {
      const next: Record<string, string> = {
        ...prev,
        [name]: cleanVal,
      };

      const key = name.toLowerCase();

      if (key === "color" || key === "colour") {
        const matchingColorVariants = variantOptions.filter((variant: ProductVariantOption) =>
          sameValue(getVariantColor(variant), cleanVal),
        );

        const validSizes = sortVariantValues(matchingColorVariants.map((variant: ProductVariantOption) => cleanSingleValue(variant.size)));
        const currentSize = next["Size"] || "";

        if (validSizes.length && !validSizes.some((size) => sameValue(size, currentSize))) {
          next["Size"] = validSizes[0];
        }

        if (!validSizes.length) {
          delete next["Size"];
        }
      }

      if (key === "size") {
        const matchingSizeVariants = variantOptions.filter((variant: ProductVariantOption) =>
          sameValue(variant.size, cleanVal),
        );

        const currentColor = next["Color"] || "";

        if (currentColor && !matchingSizeVariants.some((variant: ProductVariantOption) => sameValue(getVariantColor(variant), currentColor))) {
          const nextColor = sortVariantValues(matchingSizeVariants.map((variant: ProductVariantOption) => getVariantColor(variant)))[0] || "";
          if (nextColor) next["Color"] = nextColor;
          else delete next["Color"];
        }
      }

      return next;
    });
  };

  const getColorHex = (val: string) => {
    const key = String(val || "").trim().toLowerCase();
    const map: Record<string, string> = {
      black: "#000000",
      white: "#ffffff",
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
      yellow: "#eab308",
      gray: "#6b7280",
      grey: "#6b7280",
      brown: "#78350f",
      pink: "#ec4899",
      olive: "#808000",
      "p olive": "#808000",
      "sky blue": "#87ceeb",
      "ice blue": "#d9f2ff",
      khaki: "#bdb76b",
      chocolate: "#7b3f00",
      wine: "#722f37",
      "sea green": "#2e8b57",
      "dark bblue": "#1e3a8a",
      "dark blue": "#1e3a8a",
      "aqua blue": "#00ffff",
      mauve: "#e0b0ff",
      limestone: "#d8d6cf",
      "forest green": "#228b22",
      "dark grey": "#374151",
      "light grey": "#d1d5db",
      "olive green": "#556b2f",
      "cherry red": "#de3163",
      "ash grey": "#b2beb5",
      "elephant grey": "#8b8c89",
      pista: "#93c572",
      ston: "#8f8f8f",
      stone: "#8f8f8f",
      biscuit: "#d2b48c",
    };

    const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(val);

    if (isHex) return val;
    if (map[key]) return map[key];
    return "#d1d5db";
  };

  const handleQuantityChange = (type: "plus" | "minus") => {
    setQuantity((q) => {
      if (type === "minus") return Math.max(1, q - 1);
      if (availableStock > 0) return Math.min(availableStock, q + 1);
      return q + 1;
    });
  };

  const addProductToCart = async () => {
    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return false;
    }

    if (sizeValues.length > 0 && !selectedSize) {
      setCartError("Please select size.");
      setCartMessage("");
      return false;
    }

    if (colorValues.length > 0 && !selectedColor) {
      setCartError("Please select color.");
      setCartMessage("");
      return false;
    }

    if (!exactSelectedVariant) {
      setCartError("Selected size and color combination is not available.");
      setCartMessage("");
      return false;
    }

    if (getVariantStockCount(exactSelectedVariant) <= 0) {
      setCartError("Product is out of stock.");
      setCartMessage("");
      return false;
    }

    const variantId = getVariantIdValue(exactSelectedVariant, product);
    const realProductId = Number((product as any).productId || (product as any).product_id || product.id || 0) || variantId;

    if (!variantId) {
      setCartError("Product variant id not found.");
      setCartMessage("");
      return false;
    }

    await addToCart({
      user_id: userId,
      product_id: realProductId,
      variant_id: variantId,
      selected_size: selectedSize,
      selected_color: selectedColor,
      quantity,
    });

    setCartError("");
    setCartMessage("Added to cart successfully.");
    return true;
  };

  const handleAddToCart = async () => {
    if (isAdding) return;

    setIsAdding(true);

    try {
      await addProductToCart();
    } catch (err: any) {
      setCartError(err?.message || "Unable to add to cart");
      setCartMessage("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isAdding) return;

    setIsAdding(true);

    try {
      const added = await addProductToCart();
      if (added) navigate("/cart");
    } catch (err: any) {
      setCartError(err?.message || "Unable to add to cart");
      setCartMessage("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = async () => {
    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return;
    }

    if (!backendProductId || isUpdatingWishlist) return;

    setIsUpdatingWishlist(true);

    try {
      const variantId = getVariantIdValue(exactSelectedVariant || imageVariant || priceVariant, product) || backendProductId;

      if (isWishlisted) {
        const res = await fetch(`${API_BASE}/api/wishlist`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            product_id: backendProductId,
            variant_id: variantId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Unable to remove from wishlist");
        }

        const ids = readWishlistIds(userId).filter((item) => item !== backendProductId);
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
            product_id: backendProductId,
            variant_id: variantId,
            actual_product_id: backendProductId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Unable to add to wishlist");
        }

        const ids = Array.from(new Set([...readWishlistIds(userId), backendProductId]));
        writeWishlistIds(userId, ids);
        setIsWishlisted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

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
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
            {finalDisplayImages.length > 1 && (
              <div
                ref={desktopThumbContainerRef}
                className="hidden lg:flex flex-col w-20 lg:w-22 shrink-0 -mt-2 overflow-y-auto h-[450px] xl:h-[600px] gap-3 py-2 scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {finalDisplayImages.map((src: string, index: number) => (
                  <div
                    key={`${src}-${index}`}
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
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="group flex-1 relative bg-white aspect-3/4 xl:aspect-4/5 overflow-hidden min-w-0 z-0">
              <Carousel
                ref={mainCarouselRef}
                responsive={mainResponsive}
                infinite={finalDisplayImages.length > 1}
                customLeftArrow={<CustomLeftArrow />}
                customRightArrow={<CustomRightArrow />}
                afterChange={(_prev: number, state: any) => {
                  const realIndex =
                    (state.currentSlide - 2 + finalDisplayImages.length) % finalDisplayImages.length;
                  if (realIndex !== selectedIndex) {
                    setSelectedIndex(realIndex);
                  }
                }}
                itemClass="flex items-center justify-center h-full w-full"
                containerClass="h-full w-full"
                sliderClass="h-full"
              >
                {finalDisplayImages.map((src: string, index: number) => (
                  <div
                    className="w-full h-full relative cursor-pointer"
                    key={`${src}-${index}`}
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
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ))}
              </Carousel>

              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-3 z-10">
                <button
                  onClick={handleShare}
                  aria-label="Share product"
                  className="w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-700 hover:text-black"
                >
                  <FiShare2 size={18} />
                </button>
                <button
                  onClick={handleWishlistToggle}
                  aria-label="Toggle wishlist"
                  disabled={isUpdatingWishlist}
                  className={`w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer disabled:opacity-60 ${
                    isWishlisted
                      ? "text-red-500 hover:text-red-500"
                      : "text-gray-700 hover:text-black"
                  }`}
                >
                  <FiHeart
                    size={18}
                    className={isWishlisted ? "fill-red-500" : ""}
                  />
                </button>
              </div>
            </div>

            {finalDisplayImages.length > 1 && (
              <div className="lg:hidden mt-4">
                <Carousel
                  ref={mobileThumbCarouselRef}
                  responsive={thumbResponsiveMobile}
                  arrows={false}
                  partialVisible={true}
                  itemClass="pr-3"
                >
                  {finalDisplayImages.map((src: string, index: number) => (
                    <div
                      key={`${src}-${index}`}
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
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col py-2 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
              {product.title}
            </h1>

            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {product.brand}
            </p>

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
                      ((currentCompareAtPrice - currentPrice) / currentCompareAtPrice) * 100,
                    )}
                    % OFF
                  </span>
                </>
              )}

              <span className="text-gray-300 hidden sm:inline">|</span>

              <div className="flex items-center gap-1 text-[#f5b82e]">
                <RatingStars rating={product.ratings?.average || 0} />
                <span className="text-gray-500 text-sm ml-2 font-medium">
                  ({product.ratings?.count || 0} reviews)
                </span>
              </div>
            </div>

            <div
              className="prose prose-sm text-gray-500 leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: product.description }}
            ></div>

            <div className="flex flex-col gap-6 mb-6">
              {enhancedProduct.options_with_values?.map((option) => {
                const isColor = ["color", "colour"].includes(option.name.toLowerCase());

                return (
                  <div key={option.name} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                        {option.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {option.values.map((val) => {
                        const cleanVal = cleanSingleValue(val);
                        if (!cleanVal) return null;
                        const isSelected = selectedOptions[option.name] === cleanVal;

                        if (isColor) {
                          return (
                            <button
                              key={cleanVal}
                              onClick={() => handleOptionChange(option.name, cleanVal)}
                              title={cleanVal}
                              className={`w-8 h-8 rounded-full border border-gray-100 transition-all ${
                                isSelected
                                  ? "ring-2 ring-gray-400 ring-offset-2 scale-110"
                                  : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: getColorHex(cleanVal) }}
                              aria-label={`Select Color ${cleanVal}`}
                            />
                          );
                        }

                        return (
                          <button
                            key={cleanVal}
                            onClick={() => handleOptionChange(option.name, cleanVal)}
                            className={`min-w-12 px-4 py-2.5 rounded-sm text-sm font-source-sans font-bold uppercase tracking-wider transition-all border ${
                              isSelected
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-800 border-gray-300 hover:border-gray-900"
                            }`}
                          >
                            {cleanVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 mb-2">
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

              <div ref={actionContainerRef} className="md:flex hidden flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || !currentVariant.available}
                  className={`flex-1 cursor-pointer py-3.5 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${
                    !currentVariant.available
                      ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50"
                  }`}
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
                  disabled={isAdding || !currentVariant.available}
                  className={`flex-1 py-3.5 cursor-pointer flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${
                    !currentVariant.available
                      ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed"
                      : "bg-primary/90 hover:bg-primary text-black border-primary"
                  }`}
                >
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {cartError && <p className="text-red-500 text-sm mt-2">{cartError}</p>}
            {cartMessage && <p className="text-green-600 text-sm mt-2">{cartMessage}</p>}

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

      {!!recommendedProducts.length && (
        <div className="mt-12 md:mt-20 border-t border-gray-100 pt-8 md:pt-16">
          <NamedSection
            title="You May Also Like"
            productData={recommendedProducts}
            autoplay={false}
          />
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 md:hidden transition-transform duration-300 translate-y-0">
        <div className="flex flex-row gap-3 w-full mx-auto">
          <button
            onClick={handleAddToCart}
            disabled={isAdding || !currentVariant.available}
            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all border ${
              !currentVariant.available
                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50 hover:text-red-500 hover:border-red-500"
            }`}
          >
            {isAdding ? "Adding..." : "Add to Cart"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={isAdding || !currentVariant.available}
            className={`flex-[1.5] py-2 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-md font-source-sans transition-all border ${
              !currentVariant.available
                ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed"
                : "bg-primary text-black border-primary hover:bg-red-600 hover:border-red-600"
            }`}
          >
            {currentVariant?.price ? `Buy at ${formatMoney(currentPrice)}` : "Buy Now"}
          </button>
        </div>
      </div>

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

        <div className="flex-1 w-full max-w-5xl flex items-center justify-center relative mb-6 overflow-hidden">
          <Carousel
            ref={lightboxCarouselRef}
            responsive={mainResponsive}
            infinite={finalDisplayImages.length > 1}
            customLeftArrow={<CustomLeftArrow />}
            customRightArrow={<CustomRightArrow />}
            afterChange={(_prev: number, state: any) => {
              const realIndex =
                (state.currentSlide - 2 + finalDisplayImages.length) % finalDisplayImages.length;
              if (realIndex !== lightboxIndex) {
                setLightboxIndex(realIndex);
              }
            }}
            itemClass="flex items-center justify-center h-full w-full"
            containerClass="h-full w-full"
            sliderClass="h-full"
          >
            {finalDisplayImages.map((src: string, index: number) => (
              <div
                className="w-full h-full relative flex items-center justify-center"
                key={`${src}-${index}`}
              >
                <img
                  src={src}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                  alt={`Enlarged product ${index + 1}`}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              </div>
            ))}
          </Carousel>
        </div>

        {finalDisplayImages.length > 1 && (
          <div
            className="h-20 md:h-24 max-w-2xl w-full flex justify-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {finalDisplayImages.map((src: string, idx: number) => (
              <div
                key={`${src}-${idx}`}
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
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
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