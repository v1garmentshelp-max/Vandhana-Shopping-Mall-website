import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import CarouselModule from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import type { Product } from "../../Models/Product";
import NamedSection from "../../components/NamedSection";
import { fetchProductById, fetchProductsByGender } from "../../services/productsApi";
import { addToCart } from "../../services/cartApi";
import { FiChevronLeft, FiChevronRight, FiMinus, FiPlus, FiShoppingBag, FiTruck, FiHelpCircle, FiX, FiHeart, FiShare2 } from "react-icons/fi";
import { FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";

const Carousel = (CarouselModule as any).default || CarouselModule;
const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = { id?: number; name?: string; email?: string; mobile?: string; type?: string };
type StockSource = { variantId: number; available: number };
type Variant = {
  id: string | number;
  variantId: string | number;
  productId: string | number;
  size: string;
  color: string;
  colorValue: string;
  barcode: string;
  mrp: number;
  salePrice: number;
  available: number;
  stockSources: StockSource[];
  raw: any;
};

const text = (value: any) => String(value ?? "").trim();

const numberValue = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positiveId = (value: any) => {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const uniqueStrings = (values: any[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const clean = text(value);
    const key = clean.toLowerCase();

    if (!clean || seen.has(key)) return;

    seen.add(key);
    output.push(clean);
  });

  return output;
};

const parseArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

const imageValue = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return text(value.image_url || value.imageUrl || value.secure_url || value.url);
};

const validImage = (value: any) => {
  const image = text(value).toLowerCase();
  return Boolean(image && image !== "[object object]" && !image.includes("undefined") && !image.includes("null") && !image.includes("placeholder.svg"));
};

const uniqueImages = (values: any[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const image = imageValue(value);
    const key = image.toLowerCase();

    if (!validImage(image) || seen.has(key)) return;

    seen.add(key);
    output.push(image);
  });

  return output;
};

const normalizeImageType = (value: any) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const imageByType = (images: any[], types: string[]) => {
  const targets = types.map(normalizeImageType);

  const found = images.find((item: any) => {
    const type = normalizeImageType(item?.image_type || item?.imageType || item?.type || item?.label || item?.name || item?.view || item?.position);
    return targets.some((target) => type === target || type.includes(target));
  });

  return imageValue(found);
};

const sourceImagePair = (source: any) => {
  const raw = parseArray(source?.images);
  const front = imageValue(source?.front_image_url || source?.frontImageUrl || source?.main_image_url || source?.mainImageUrl || source?.image_url || source?.imageUrl || imageByType(raw, ["front", "primary", "main", "default"]) || raw[0]);
  const back = imageValue(source?.back_image_url || source?.backImageUrl || source?.rear_image_url || source?.rearImageUrl || imageByType(raw, ["back", "rear"]));
  return uniqueImages([front, back]).slice(0, 2);
};

const normalizeSize = (value: any) => text(value).toUpperCase().replace(/\s+/g, "");
const sameSize = (a: any, b: any) => normalizeSize(a) === normalizeSize(b);

const normalizeColor = (value: any) => {
  const normalized = text(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  const aliases: Record<string, string> = {
    darkblue: "dark blue",
    "dark bblue": "dark blue",
    "dark blu": "dark blue",
    seablue: "sea blue",
    "sea blu": "sea blue",
    iceblue: "ice blue",
    "ice blu": "ice blue",
    navyb: "navy blue",
    "navy b": "navy blue",
    navyblue: "navy blue",
    "navy blu": "navy blue",
    horizonblue: "horizon blue",
    "horizon blu": "horizon blue",
    offwhite: "off white",
    lightgray: "light grey",
    "light gray": "light grey",
    darkgray: "dark grey",
    "dark gray": "dark grey",
    "ash gray": "ash grey",
    "elephant gray": "elephant grey",
    "bottel green": "bottle green",
    "botal green": "bottle green",
    "mehandi green": "mehendi green",
    ston: "stone",
    "p olive": "olive",
    "skin colour": "skin",
    "skin color": "skin",
    "aqua marine": "aquamarine",
    violate: "violet",
    onionpink: "onion",
    "onion pink": "onion",
    frenchwine: "french wine",
    peacockgreen: "peacock green",
    cherrybrown: "cherry brown",
    "multi colour": "multicolor",
    "multi color": "multicolor",
  };

  return aliases[normalized] || normalized;
};

const sameColor = (a: any, b: any) => normalizeColor(a) === normalizeColor(b);
const discountedPrice = (price: number, discount: number) => Math.round((price - (price * discount) / 100 + Number.EPSILON) * 100) / 100;

const firstDiscount = (...values: any[]) => {
  for (const value of values) {
    const discount = Math.min(100, Math.max(0, numberValue(value, 0)));
    if (discount > 0) return discount;
  }

  return 0;
};

const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const wishlistKey = (userId: number) => `wishlist_product_ids_${userId}`;

const readWishlist = (userId: number) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(wishlistKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeWishlist = (userId: number, ids: number[]) => {
  localStorage.setItem(wishlistKey(userId), JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-updated"));
};

const productBackendId = (product: any) => positiveId(product?.productId || product?.product_id || product?.id);

const normalizeStockSources = (raw: any, variantId: any, available: number) => {
  const values = Array.isArray(raw?.stock_sources) ? raw.stock_sources : Array.isArray(raw?.stockSources) ? raw.stockSources : [];
  const sources = values.length ? values : variantId ? [{ variant_id: variantId, available_qty: available }] : [];
  const grouped = new Map<number, number>();

  sources.forEach((source: any) => {
    const id = positiveId(source?.variant_id || source?.variantId);

    if (!id) return;

    const stock = Math.max(0, numberValue(source?.available_qty ?? source?.availableQty ?? Math.max(0, numberValue(source?.on_hand ?? source?.onHand, 0) - numberValue(source?.reserved, 0)), 0));
    grouped.set(id, Math.max(grouped.get(id) || 0, stock));
  });

  return Array.from(grouped.entries()).map(([id, stock]) => ({ variantId: id, available: stock })).sort((a, b) => b.available - a.available);
};

const normalizeVariant = (raw: any, product: any): Variant => {
  const variantId = raw?.variant_id || raw?.variantId || raw?.id || "";
  const productId = raw?.product_id || raw?.productId || product?.product_id || product?.productId || "";
  const size = text(raw?.size || raw?.selected_size || raw?.selectedSize);
  const color = text(raw?.colour || raw?.color || raw?.selected_colour || raw?.selectedColor || raw?.selected_color);
  const mrp = numberValue(raw?.original_price_b2c ?? raw?.mrp ?? raw?.original_price ?? product?.original_price_b2c ?? product?.originalPrice ?? product?.mrp ?? product?.price, 0);
  const discount = firstDiscount(raw?.b2c_discount_pct, raw?.discount_b2c, raw?.discount_percentage, raw?.discount_percent, raw?.discount, product?.b2c_discount_pct, product?.discount_b2c, product?.discount_percentage, product?.discount_percent, product?.discount);
  const directPrice = numberValue(raw?.final_price_b2c ?? raw?.b2c_final_price ?? raw?.sale_price ?? raw?.price ?? raw?.selling_price ?? raw?.discounted_price ?? raw?.mahaveer_price ?? product?.final_price_b2c ?? product?.salePrice ?? product?.sale_price ?? product?.price, mrp);
  const salePrice = discount > 0 && mrp > 0 ? discountedPrice(mrp, discount) : directPrice;
  const onHand = numberValue(raw?.on_hand ?? raw?.onHand, 0);
  const reserved = numberValue(raw?.reserved ?? raw?.reserved_qty ?? raw?.reservedQty, 0);
  const available = Math.max(0, numberValue(raw?.available_qty ?? raw?.availableQty ?? Math.max(0, onHand - reserved), Math.max(0, onHand - reserved)));
  const colorValue = text(raw?.colour_hex || raw?.color_hex || raw?.colourHex || raw?.colorHex || raw?.swatch_color || raw?.swatchColor || product?.colour_hex || product?.color_hex || product?.colourHex || product?.colorHex || product?.swatch_color || product?.swatchColor);

  return {
    id: variantId,
    variantId,
    productId,
    size,
    color,
    colorValue,
    barcode: text(raw?.barcode || raw?.ean_code || raw?.eanCode),
    mrp,
    salePrice,
    available,
    stockSources: normalizeStockSources(raw, variantId, available),
    raw,
  };
};

const getVariants = (product: any): Variant[] => {
  if (!product) return [];

  const rawVariants: any[] = Array.isArray(product.variants) && product.variants.length ? product.variants : [product];

  return rawVariants.map((raw: any) => normalizeVariant(raw, product)).filter((variant: Variant) => text(variant.variantId) && (variant.size || variant.color));
};

const routeVariant = (variants: Variant[], routeId: any) => {
  const target = text(routeId);
  return variants.find((variant: Variant) => [variant.variantId, variant.id, variant.barcode].map(text).includes(target)) || null;
};

const matchingVariants = (variants: Variant[], size: string, color: string) => variants.filter((variant: Variant) => (!size || sameSize(variant.size, size)) && (!color || sameColor(variant.color, color)));

const aggregateSources = (variants: Variant[]) => {
  const grouped = new Map<number, number>();

  variants.forEach((variant: Variant) => {
    const fallbackId = positiveId(variant.variantId);
    const sources = variant.stockSources.length ? variant.stockSources : fallbackId ? [{ variantId: fallbackId, available: variant.available }] : [];

    sources.forEach((source: StockSource) => grouped.set(source.variantId, Math.max(grouped.get(source.variantId) || 0, source.available)));
  });

  return Array.from(grouped.entries()).map(([variantId, available]) => ({ variantId, available })).filter((source) => source.available > 0).sort((a, b) => b.available - a.available);
};

const aggregateStock = (variants: Variant[]) => aggregateSources(variants).reduce((sum, source) => sum + source.available, 0);
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL"];

const sortSizes = (values: string[]) => uniqueStrings(values).sort((a, b) => {
  const first = normalizeSize(a);
  const second = normalizeSize(b);
  const firstIndex = SIZE_ORDER.indexOf(first);
  const secondIndex = SIZE_ORDER.indexOf(second);

  if (firstIndex !== -1 && secondIndex !== -1) return firstIndex - secondIndex;
  if (firstIndex !== -1) return -1;
  if (secondIndex !== -1) return 1;

  const firstNumber = Number(first);
  const secondNumber = Number(second);

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) return firstNumber - secondNumber;

  return first.localeCompare(second, undefined, { numeric: true });
});

const sortColors = (values: string[]) => {
  const map = new Map<string, string>();

  values.forEach((value) => {
    const clean = text(value);
    const key = normalizeColor(clean);

    if (clean && key && !map.has(key)) map.set(key, clean);
  });

  return Array.from(map.values()).sort((a, b) => normalizeColor(a).localeCompare(normalizeColor(b)));
};

const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#dc2626",
  maroon: "#800000",
  burgundy: "#800020",
  wine: "#722f37",
  "french wine": "#781f3d",
  pink: "#ec4899",
  "light pink": "#f9a8d4",
  "baby pink": "#f4c2c2",
  onion: "#c7789f",
  peach: "#ffcba4",
  orange: "#f97316",
  rust: "#b7410e",
  brown: "#78350f",
  chocolate: "#7b3f00",
  coffee: "#6f4e37",
  tan: "#d2b48c",
  beige: "#d8c3a5",
  biscuit: "#d2b48c",
  camel: "#c19a6b",
  khaki: "#bdb76b",
  cream: "#fffdd0",
  ivory: "#fffff0",
  "off white": "#faf9f6",
  skin: "#d2a679",
  gold: "#d4af37",
  mustard: "#c99700",
  silver: "#c0c0c0",
  grey: "#6b7280",
  gray: "#6b7280",
  "light grey": "#d1d5db",
  "dark grey": "#374151",
  "ash grey": "#b2beb5",
  "elephant grey": "#8b8c89",
  charcoal: "#36454f",
  stone: "#8f8f8f",
  blue: "#2563eb",
  "dark blue": "#1e3a8a",
  "light blue": "#add8e6",
  navy: "#000080",
  "navy blue": "#000080",
  "horizon blue": "#4f6f8f",
  "royal blue": "#4169e1",
  "sky blue": "#87ceeb",
  "sea blue": "#2e8b9e",
  "ice blue": "#d9f2ff",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  cyan: "#00bcd4",
  turquoise: "#40e0d0",
  teal: "#008080",
  indigo: "#4b0082",
  green: "#16a34a",
  "dark green": "#14532d",
  "light green": "#90ee90",
  "bottle green": "#006a4e",
  "forest green": "#228b22",
  "peacock green": "#007f72",
  "olive green": "#556b2f",
  olive: "#808000",
  "mehendi green": "#556b2f",
  "rama green": "#008f83",
  "light rama green": "#78d7c4",
  mint: "#98ff98",
  yellow: "#eab308",
  lemon: "#fff44f",
  purple: "#7e22ce",
  violet: "#7f00ff",
  lavender: "#c4a7e7",
  mauve: "#b784a7",
  lilac: "#c8a2c8",
  plum: "#8e4585",
  magenta: "#d946ef",
};

const colorBackground = (name: string, provided?: string) => {
  const supplied = text(provided);

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(supplied) || /^(rgb|rgba|hsl|hsla|linear-gradient|radial-gradient|conic-gradient)\(/i.test(supplied)) return supplied;

  const normalized = normalizeColor(name);

  if (normalized === "multicolor" || normalized.includes("rainbow") || normalized.includes("assorted")) return "conic-gradient(#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)";
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  if (normalized.includes("navy")) return COLOR_MAP["navy blue"];
  if (normalized.includes("horizon")) return COLOR_MAP["horizon blue"];
  if (normalized.includes("blue")) return COLOR_MAP.blue;
  if (normalized.includes("green")) return COLOR_MAP.green;
  if (normalized.includes("black")) return COLOR_MAP.black;
  if (normalized.includes("white")) return COLOR_MAP.white;
  if (normalized.includes("red")) return COLOR_MAP.red;
  if (normalized.includes("pink")) return COLOR_MAP.pink;
  if (normalized.includes("brown")) return COLOR_MAP.brown;
  if (normalized.includes("grey") || normalized.includes("gray")) return COLOR_MAP.grey;

  return "#d1d5db";
};

const selectedImages = (variants: Variant[], product: any, color: string) => {
  const exact = variants.length ? variants : [];
  const sameColorVariants = color ? getVariants(product).filter((variant: Variant) => sameColor(variant.color, color)) : [];
  const candidates = exact.length ? exact : sameColorVariants;
  let front = "";
  let back = "";

  for (const variant of candidates) {
    const pair = sourceImagePair(variant.raw);

    if (!front && pair[0]) front = pair[0];
    if (!back && pair[1]) back = pair[1];
    if (front && back) break;
  }

  const variantPair = uniqueImages([front, back]).slice(0, 2);

  if (variantPair.length) return variantPair;

  const fallback = sourceImagePair(product).slice(0, 2);

  return fallback.length ? fallback : ["/placeholder.svg"];
};

const sameProduct = (first: any, second: any) => {
  const firstId = productBackendId(first);
  const secondId = productBackendId(second);

  if (firstId && secondId) return firstId === secondId;

  return [text(first?.gender || first?.category).toLowerCase(), text(first?.categoryId || first?.category_id), text(first?.brand || first?.brand_name).toLowerCase(), text(first?.title || first?.name || first?.product_name).toLowerCase()].join("|") === [text(second?.gender || second?.category).toLowerCase(), text(second?.categoryId || second?.category_id), text(second?.brand || second?.brand_name).toLowerCase(), text(second?.title || second?.name || second?.product_name).toLowerCase()].join("|");
};

const CustomLeftArrow = ({ onClick }: any) => <button type="button" onClick={onClick} className="absolute opacity-0 group-hover:opacity-100 left-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"><FiChevronLeft size={20} /></button>;
const CustomRightArrow = ({ onClick }: any) => <button type="button" onClick={onClick} className="absolute opacity-0 group-hover:opacity-100 right-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"><FiChevronRight size={20} /></button>;

const RatingStars = ({ rating }: { rating: number }) => {
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  const empty = 5 - full - (half ? 1 : 0);

  return <div className="flex items-center gap-1">{Array.from({ length: full }).map((_, index) => <FaStar key={`full-${index}`} size={14} />)}{half ? <FaStarHalfAlt size={14} /> : null}{Array.from({ length: empty }).map((_, index) => <FaRegStar key={`empty-${index}`} size={14} />)}</div>;
};

const ProductDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [updatingWishlist, setUpdatingWishlist] = useState(false);
  const mainCarouselRef = useRef<any>(null);
  const lightboxCarouselRef = useRef<any>(null);

  const backendProductId = useMemo(() => productBackendId(product), [product]);
  const allVariants = useMemo<Variant[]>(() => getVariants(product), [product]);

  const activeVariants = useMemo<Variant[]>(() => {
    const stocked = allVariants.filter((variant: Variant) => variant.available > 0);
    return stocked.length ? stocked : allVariants;
  }, [allVariants]);

  const colors = useMemo<string[]>(() => sortColors(activeVariants.map((variant: Variant) => variant.color)), [activeVariants]);

  const sizes = useMemo<string[]>(() => {
    const filtered = selectedColor ? activeVariants.filter((variant: Variant) => sameColor(variant.color, selectedColor)) : activeVariants;
    return sortSizes(filtered.map((variant: Variant) => variant.size));
  }, [activeVariants, selectedColor]);

  const selectedVariants = useMemo<Variant[]>(() => matchingVariants(activeVariants, selectedSize, selectedColor), [activeVariants, selectedSize, selectedColor]);

  const selectedVariant = selectedVariants[0] || activeVariants.find((variant: Variant) => (!selectedColor || sameColor(variant.color, selectedColor)) && (!selectedSize || sameSize(variant.size, selectedSize))) || activeVariants[0] || null;

  const stockSources = useMemo<StockSource[]>(() => aggregateSources(selectedVariants.length ? selectedVariants : selectedVariant ? [selectedVariant] : []), [selectedVariants, selectedVariant]);
  const availableStock = useMemo<number>(() => aggregateStock(selectedVariants.length ? selectedVariants : selectedVariant ? [selectedVariant] : []), [selectedVariants, selectedVariant]);
  const currentPrice = selectedVariant?.salePrice || numberValue((product as any)?.price, 0);
  const comparePrice = selectedVariant?.mrp || numberValue((product as any)?.originalPrice || (product as any)?.mrp || (product as any)?.price, currentPrice);
  const images = useMemo<string[]>(() => selectedImages(selectedVariants.length ? selectedVariants : selectedVariant ? [selectedVariant] : [], product, selectedColor).slice(0, 2), [selectedVariants, selectedVariant, product, selectedColor]);
  const path = text((product as any)?.categoryPath || (product as any)?.category_path || [(product as any)?.parentCategoryName || (product as any)?.parent_category_name, (product as any)?.categoryName || (product as any)?.category_name].filter(Boolean).join(" > "));

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        setProduct(null);
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const found = await fetchProductById(id, 3);

        if (!alive) return;

        if (!found) {
          setProduct(null);
          setLoadError("Product not found");
          return;
        }

        const variants = getVariants(found);
        const available = variants.filter((variant: Variant) => variant.available > 0);
        const usable = available.length ? available : variants;
        const routed = routeVariant(usable, id) || routeVariant(variants, id);
        const productColor = text((found as any).selectedColor || (found as any).selected_colour || (found as any).displayColor || (found as any).display_color || (found as any).color || (found as any).colour);
        const productSize = text((found as any).selectedSize || (found as any).selected_size || (found as any).displaySize || (found as any).display_size || (found as any).size);
        const first = routed || usable.find((variant: Variant) => (!productColor || sameColor(variant.color, productColor)) && (!productSize || sameSize(variant.size, productSize))) || usable[0] || variants[0];

        setProduct(found);
        setSelectedColor(first?.color || productColor || text((found as any).colors?.[0]));
        setSelectedSize(first?.size || productSize || text((found as any).sizes?.[0]));
        setQuantity(1);
        setSelectedImage(0);
        setLightboxImage(0);
      } catch (error: any) {
        if (alive) {
          setProduct(null);
          setLoadError(error?.message || "Unable to load product");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!activeVariants.length) return;
    if (matchingVariants(activeVariants, selectedSize, selectedColor).length) return;

    const next = activeVariants.find((variant: Variant) => selectedColor && sameColor(variant.color, selectedColor)) || activeVariants.find((variant: Variant) => selectedSize && sameSize(variant.size, selectedSize)) || activeVariants[0];

    if (next) {
      setSelectedColor(next.color);
      setSelectedSize(next.size);
    }
  }, [activeVariants, selectedColor, selectedSize]);

  useEffect(() => {
    if (!selectedColor || !sizes.length) return;
    if (!sizes.some((size: string) => sameSize(size, selectedSize))) setSelectedSize(sizes[0]);
  }, [selectedColor, selectedSize, sizes]);

  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0);
    setLightboxImage(0);
    setTimeout(() => mainCarouselRef.current?.goToSlide?.(2), 0);
  }, [selectedColor, selectedSize]);

  useEffect(() => {
    let alive = true;

    const loadRecommended = async () => {
      if (!product) {
        setRecommended([]);
        return;
      }

      try {
        const products = await fetchProductsByGender((product as any).gender, 3);

        if (!alive) return;

        setRecommended(products.filter((item: Product) => !sameProduct(product, item)).slice(0, 10));
      } catch {
        if (alive) setRecommended([]);
      }
    };

    void loadRecommended();

    return () => {
      alive = false;
    };
  }, [product]);

  useEffect(() => {
    const sync = () => {
      const user = getStoredUser();
      const userId = Number(user?.id || 0);
      setWishlisted(Boolean(userId && backendProductId && readWishlist(userId).includes(backendProductId)));
    };

    sync();
    window.addEventListener("wishlist-updated", sync);

    return () => window.removeEventListener("wishlist-updated", sync);
  }, [backendProductId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!product) return <div className="min-h-screen flex flex-col gap-4 items-center justify-center text-center px-4"><h1 className="text-2xl font-bold text-gray-900">Product not found</h1><p className="text-gray-500">{loadError || "Unable to load this product."}</p><button type="button" onClick={() => navigate("/collections")} className="px-8 py-3 bg-primary text-black font-bold uppercase text-sm">Back to collections</button></div>;

  const formatMoney = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const changeColor = (color: string) => {
    setCartError("");
    setCartMessage("");
    setSelectedColor(color);

    const validSizes = sortSizes(activeVariants.filter((variant: Variant) => sameColor(variant.color, color)).map((variant: Variant) => variant.size));

    if (validSizes.length && !validSizes.some((size: string) => sameSize(size, selectedSize))) setSelectedSize(validSizes[0]);
  };

  const changeSize = (size: string) => {
    setCartError("");
    setCartMessage("");
    setSelectedSize(size);

    const validColors = sortColors(activeVariants.filter((variant: Variant) => sameSize(variant.size, size)).map((variant: Variant) => variant.color));

    if (selectedColor && !validColors.some((color: string) => sameColor(color, selectedColor))) setSelectedColor(validColors[0] || "");
  };

  const changeQuantity = (type: "plus" | "minus") => setQuantity((current: number) => type === "minus" ? Math.max(1, current - 1) : availableStock > 0 ? Math.min(availableStock, current + 1) : current + 1);

  const addProductToCart = async () => {
    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return false;
    }

    if (sizes.length && !selectedSize) {
      setCartError("Please select size.");
      return false;
    }

    if (colors.length && !selectedColor) {
      setCartError("Please select color.");
      return false;
    }

    if (!selectedVariants.length || !stockSources.length) {
      setCartError("Selected size and color combination is not available.");
      return false;
    }

    if (quantity > availableStock) {
      setCartError(`Only ${availableStock} stock available.`);
      return false;
    }

    const realProductId = backendProductId || positiveId(selectedVariant?.productId) || stockSources[0]?.variantId;

    if (!realProductId) {
      setCartError("Product id not found.");
      return false;
    }

    let remaining = quantity;

    for (const source of stockSources) {
      if (remaining <= 0) break;

      const sourceQuantity = Math.min(remaining, source.available);

      if (sourceQuantity <= 0) continue;

      await addToCart({ user_id: userId, product_id: realProductId, variant_id: source.variantId, selected_size: selectedSize, selected_color: selectedColor, quantity: sourceQuantity });

      remaining -= sourceQuantity;
    }

    if (remaining > 0) throw new Error("Unable to reserve the requested quantity.");

    setCartError("");
    setCartMessage("Added to cart successfully.");

    return true;
  };

  const handleAddToCart = async () => {
    if (adding) return;

    setAdding(true);

    try {
      await addProductToCart();
    } catch (error: any) {
      setCartError(error?.message || "Unable to add to cart");
      setCartMessage("");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (adding) return;

    setAdding(true);

    try {
      if (await addProductToCart()) navigate("/cart");
    } catch (error: any) {
      setCartError(error?.message || "Unable to add to cart");
      setCartMessage("");
    } finally {
      setAdding(false);
    }
  };

  const toggleWishlist = async () => {
    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return;
    }

    if (!backendProductId || updatingWishlist) return;

    setUpdatingWishlist(true);

    try {
      const variantId = positiveId(selectedVariant?.variantId) || backendProductId;
      const response = await fetch(`${API_BASE}/api/wishlist`, { method: wishlisted ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, product_id: backendProductId, variant_id: variantId, actual_product_id: backendProductId }) });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data?.message || "Unable to update wishlist");

      const ids = wishlisted ? readWishlist(userId).filter((item: number) => item !== backendProductId) : Array.from(new Set([...readWishlist(userId), backendProductId]));

      writeWishlist(userId, ids);
      setWishlisted(!wishlisted);
    } finally {
      setUpdatingWishlist(false);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: (product as any).title, text: `Check out ${(product as any).title}`, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch {}
  };

  const mainResponsive = { desktop: { breakpoint: { max: 3000, min: 0 }, items: 1 } };
  const hasMultipleImages = images.length > 1;
  const hasRealImages = images.some((image: string) => !image.includes("placeholder.svg"));

  const handleThumb = (index: number) => {
    setSelectedImage(index);
    if (hasMultipleImages) mainCarouselRef.current?.goToSlide?.(index + 2);
  };

  return (
    <div className="w-full bg-white font-montserrat py-6 pt-4 md:py-8 lg:py-16 lg:pt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
            {hasRealImages ? <div className="hidden lg:flex flex-col w-20 lg:w-22 shrink-0 overflow-y-auto h-[450px] xl:h-[600px] gap-3 py-2 scrollbar-none">{images.map((src: string, index: number) => <button type="button" key={`${src}-${index}`} onClick={() => handleThumb(index)} className={`w-full aspect-3/4 rounded-[9px] shrink-0 cursor-pointer overflow-hidden transition-all ${index === selectedImage ? "opacity-100 border border-[#292d35] p-[3px]" : "opacity-60 hover:opacity-100"}`}><img src={src} alt={`Thumb ${index + 1}`} loading="eager" className="w-full h-full object-cover object-top bg-gray-50 rounded-[6px]" onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></button>)}</div> : null}

            <div className="group flex-1 relative bg-white aspect-3/4 xl:aspect-4/5 overflow-hidden min-w-0 z-0">
              {hasMultipleImages ? <Carousel ref={mainCarouselRef} responsive={mainResponsive} infinite customLeftArrow={<CustomLeftArrow />} customRightArrow={<CustomRightArrow />} afterChange={(_previous: number, state: any) => setSelectedImage((state.currentSlide - 2 + images.length) % images.length)} itemClass="flex items-center justify-center h-full w-full" containerClass="h-full w-full" sliderClass="h-full">{images.map((src: string, index: number) => <button type="button" className="w-full h-full relative cursor-pointer" key={`${src}-${index}`} onClick={() => { setLightboxImage(index); setLightboxOpen(true); setTimeout(() => lightboxCarouselRef.current?.goToSlide?.(index + 2), 0); }}><img src={src} alt={`${(product as any).title} - Image ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 w-full h-full object-cover object-top rounded-2xl" onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></button>)}</Carousel> : <button type="button" className="w-full h-full relative cursor-pointer" onClick={() => { setLightboxImage(0); setLightboxOpen(true); }}><img src={images[0]} alt={(product as any).title} loading="eager" className="absolute inset-0 w-full h-full object-cover object-top rounded-2xl" onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></button>}

              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-3 z-10"><button type="button" onClick={share} aria-label="Share product" className="w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-700 hover:text-black"><FiShare2 size={18} /></button><button type="button" onClick={toggleWishlist} aria-label="Toggle wishlist" disabled={updatingWishlist} className={`w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer disabled:opacity-60 ${wishlisted ? "text-red-500" : "text-gray-700 hover:text-black"}`}><FiHeart size={18} className={wishlisted ? "fill-red-500" : ""} /></button></div>
            </div>

            {hasMultipleImages ? <div className="lg:hidden mt-4 flex gap-3 overflow-x-auto">{images.map((src: string, index: number) => <button type="button" key={`${src}-${index}`} className={`w-20 shrink-0 aspect-3/4 overflow-hidden ${index === selectedImage ? "opacity-100 border border-black" : "opacity-60"}`} onClick={() => handleThumb(index)}><img src={src} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover bg-gray-50" onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></button>)}</div> : null}
          </div>

          <div className="flex-1 flex flex-col py-2 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">{(product as any).title}</h1>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{(product as any).brand}</p>
            {path ? <p className="text-xs md:text-sm text-gray-400 mb-3">{path}</p> : null}

            <div className="flex items-center flex-wrap gap-4 mb-4"><span className="text-2xl font-bold text-gray-900">{formatMoney(currentPrice)}</span>{comparePrice > currentPrice ? <><span className="text-lg text-gray-400 line-through">{formatMoney(comparePrice)}</span><span className="text-base font-bold text-green-600 tracking-tight">{Math.round(((comparePrice - currentPrice) / comparePrice) * 100)}% OFF</span></> : null}<span className="text-gray-300 hidden sm:inline">|</span><div className="flex items-center gap-1 text-[#f5b82e]"><RatingStars rating={(product as any).ratings?.average || 0} /><span className="text-gray-500 text-sm ml-2 font-medium">({(product as any).ratings?.count || 0} reviews)</span></div></div>

            <div className="prose prose-sm text-gray-500 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: (product as any).description || "" }} />

            <div className="flex flex-col gap-6 mb-6">
              {colors.length ? <div className="flex flex-col gap-3"><span className="text-sm font-bold text-gray-900 uppercase tracking-widest">Color</span><div className="flex flex-wrap gap-3">{colors.map((color: string) => { const variant = activeVariants.find((item: Variant) => sameColor(item.color, color)); const selected = sameColor(color, selectedColor); return <button type="button" key={color} onClick={() => changeColor(color)} title={color} aria-label={`Select Color ${color}`} className={`w-8 h-8 rounded-full border border-gray-300 transition-all ${selected ? "ring-2 ring-gray-500 ring-offset-2 scale-110" : "hover:scale-110"}`} style={{ background: colorBackground(color, variant?.colorValue), boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }} />; })}</div></div> : null}

              {sizes.length ? <div className="flex flex-col gap-3"><span className="text-sm font-bold text-gray-900 uppercase tracking-widest">Size</span><div className="flex flex-wrap gap-3">{sizes.map((size: string) => <button type="button" key={size} onClick={() => changeSize(size)} className={`min-w-12 px-4 py-2.5 rounded-sm text-sm font-source-sans font-bold uppercase tracking-wider transition-all border ${sameSize(size, selectedSize) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-800 border-gray-300 hover:border-gray-900"}`}>{size}</button>)}</div></div> : null}
            </div>

            {availableStock > 0 && availableStock <= 10 ? <div className="mb-4 inline-flex w-fit items-center rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">Hurry up! Last {availableStock} stock left</div> : null}

            <div className="flex flex-col gap-4 mb-2">
              <div className="flex items-center"><button type="button" onClick={() => changeQuantity("minus")} className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition"><FiMinus size={16} /></button><input type="text" value={quantity} readOnly className="w-12 h-12 text-center text-gray-800 font-bold outline-none bg-white font-source-sans border-y border-gray-200" /><button type="button" onClick={() => changeQuantity("plus")} disabled={availableStock > 0 && quantity >= availableStock} className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition disabled:opacity-40 disabled:cursor-not-allowed"><FiPlus size={16} /></button></div>

              <div className="md:flex hidden flex-col sm:flex-row gap-3 w-full"><button type="button" onClick={handleAddToCart} disabled={adding || availableStock <= 0} className={`flex-1 cursor-pointer py-3.5 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${availableStock <= 0 ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50"}`}>{adding ? <span className="animate-pulse">Adding...</span> : <><FiShoppingBag size={16} /><span>Add to Cart</span></>}</button><button type="button" onClick={handleBuyNow} disabled={adding || availableStock <= 0} className={`flex-1 py-3.5 cursor-pointer flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${availableStock <= 0 ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed" : "bg-primary/90 hover:bg-primary text-black border-primary"}`}>Buy Now</button></div>
            </div>

            {cartError ? <p className="text-red-500 text-sm mt-2">{cartError}</p> : null}
            {cartMessage ? <p className="text-green-600 text-sm mt-2">{cartMessage}</p> : null}

            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-100 text-gray-600 text-sm font-medium"><div className="flex items-center gap-3"><FiTruck size={18} /><span>Estimated Delivery: 4 TO 6 DAYS</span></div><button type="button" className="flex items-center gap-3 hover:text-black transition self-start cursor-pointer"><FiHelpCircle size={18} />Ask a Question</button></div>
          </div>
        </div>
      </div>

      {recommended.length ? <div className="mt-12 md:mt-20 border-t border-gray-100 pt-8 md:pt-16"><NamedSection title="You May Also Like" productData={recommended} autoplay={false} /></div> : null}

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 md:hidden"><div className="flex gap-3 w-full"><button type="button" onClick={handleAddToCart} disabled={adding || availableStock <= 0} className={`flex-1 py-2 flex items-center justify-center rounded-sm font-bold uppercase text-sm border ${availableStock <= 0 ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-white text-gray-900 border-gray-900"}`}>{adding ? "Adding..." : "Add to Cart"}</button><button type="button" onClick={handleBuyNow} disabled={adding || availableStock <= 0} className={`flex-[1.5] py-2 flex items-center justify-center rounded-sm font-bold uppercase text-md border ${availableStock <= 0 ? "bg-gray-200 text-gray-400 border-transparent" : "bg-primary text-black border-primary"}`}>{currentPrice ? `Buy at ${formatMoney(currentPrice)}` : "Buy Now"}</button></div></div>

      <div className={`fixed inset-0 bg-white flex flex-col items-center justify-between pt-16 pb-8 px-4 h-dvh w-full transition-all duration-300 ${lightboxOpen ? "z-9999 opacity-100 pointer-events-auto" : "-z-50 opacity-0 pointer-events-none"}`}>
        <button type="button" onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-gray-400 hover:bg-gray-500 rounded-full text-white transition z-10 cursor-pointer shadow-sm"><FiX size={24} /></button>

        <div className="flex-1 w-full max-w-5xl flex items-center justify-center relative mb-6 overflow-hidden">{hasMultipleImages ? <Carousel ref={lightboxCarouselRef} responsive={mainResponsive} infinite customLeftArrow={<CustomLeftArrow />} customRightArrow={<CustomRightArrow />} afterChange={(_previous: number, state: any) => setLightboxImage((state.currentSlide - 2 + images.length) % images.length)} itemClass="flex items-center justify-center h-full w-full" containerClass="h-full w-full" sliderClass="h-full">{images.map((src: string, index: number) => <div className="w-full h-full relative flex items-center justify-center" key={`${src}-${index}`}><img src={src} loading="lazy" className="max-w-full max-h-full object-contain" alt={`Enlarged product ${index + 1}`} onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></div>)}</Carousel> : <img src={images[0]} loading="lazy" className="max-w-full max-h-full object-contain" alt={(product as any).title} onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} />}</div>

        {hasMultipleImages ? <div className="h-20 md:h-24 max-w-2xl w-full flex justify-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-none">{images.map((src: string, index: number) => <button type="button" key={`${src}-${index}`} onClick={() => { setLightboxImage(index); lightboxCarouselRef.current?.goToSlide?.(index + 2); }} className={`h-full aspect-3/4 shrink-0 cursor-pointer border-2 transition-all ${index === lightboxImage ? "border-black" : "border-transparent opacity-60 hover:opacity-100"}`}><img src={src} className="w-full h-full object-cover bg-gray-50" alt={`Thumb ${index + 1}`} onError={(event: React.SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = "/placeholder.svg"; }} /></button>)}</div> : null}
      </div>
    </div>
  );
};

export default ProductDetails;