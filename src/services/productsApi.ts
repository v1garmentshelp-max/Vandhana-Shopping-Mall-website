import type { Product, ProductGender, ProductImage } from "../Models/Product";
import categoriesJson from "../Data/categories.json";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";
const DEFAULT_BRANCH_ID = 3;

type CategoryRecord = {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  slug?: string;
};

const categories = categoriesJson as CategoryRecord[];

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toGender = (value: any): ProductGender => {
  const s = normalizeText(value);
  if (s.includes("women")) return "Women";
  if (s.includes("kid")) return "Kids";
  return "Men";
};

const uniqueStrings = (items: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  items.forEach((item) => {
    const value = String(item || "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
};

const parseImages = (value: any): ProductImage[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { image_url: item };
        return item;
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return { image_url: item };
            return item;
          })
          .filter(Boolean);
      }
    } catch {
      if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
        return [{ image_url: value }];
      }
    }
  }
  return [];
};

const imageUrlFromRecord = (image: any) => {
  if (typeof image === "string") return String(image || "").trim();
  return String(image?.image_url || image?.secure_url || image?.url || "").trim();
};

const getGenderCategoryId = (gender: ProductGender) => {
  return (
    categories.find(
      (c) => c.level === 0 && normalizeText(c.name) === normalizeText(gender),
    )?.id || ""
  );
};

const getLeafCategoriesForGender = (gender: ProductGender) => {
  const genderId = getGenderCategoryId(gender);
  if (!genderId) return [];

  const level1Ids = categories
    .filter((c) => c.level === 1 && c.parentId === genderId)
    .map((c) => c.id);

  return categories.filter((c) => c.level === 2 && level1Ids.includes(c.parentId || ""));
};

const findCategoryId = (gender: ProductGender, productName: string) => {
  const leafCategories = getLeafCategoriesForGender(gender);
  if (!leafCategories.length) return "";

  const name = normalizeText(productName);

  const aliases = [
    { keys: ["oversized"], targets: ["oversized t shirts", "oversized tees", "t shirts"] },
    { keys: ["polo"], targets: ["polo t shirts", "polos", "t shirts"] },
    { keys: ["t shirt", "tshirt", "tee"], targets: ["t shirts", "tees"] },
    { keys: ["top"], targets: ["tops", "t shirts"] },
    { keys: ["shirt"], targets: ["shirts", "t shirts"] },
    { keys: ["jogger"], targets: ["joggers"] },
    { keys: ["vest"], targets: ["vests"] },
    { keys: ["short"], targets: ["shorts"] },
    { keys: ["jean"], targets: ["jeans"] },
    { keys: ["pant", "trouser"], targets: ["pants", "trousers"] },
    { keys: ["hoodie"], targets: ["hoodies"] },
    { keys: ["sweatshirt"], targets: ["sweatshirts"] },
  ];

  for (const alias of aliases) {
    if (alias.keys.some((key) => name.includes(normalizeText(key)))) {
      for (const target of alias.targets) {
        const exact = leafCategories.find(
          (c) => normalizeText(c.name) === normalizeText(target),
        );
        if (exact) return exact.id;

        const partial = leafCategories.find(
          (c) =>
            normalizeText(c.name).includes(normalizeText(target)) ||
            normalizeText(target).includes(normalizeText(c.name)),
        );
        if (partial) return partial.id;
      }
    }
  }

  const direct = leafCategories.find(
    (c) => name.includes(normalizeText(c.name)) || normalizeText(c.name).includes(name),
  );

  return direct?.id || leafCategories[0]?.id || "";
};

const normalizeProduct = (row: any): Product => {
  const productName = String(row.product_name || row.name || row.title || "Product").trim();
  const brandName = String(row.brand_name || row.brand || "Vandhana").trim();
  const gender = toGender(row.gender);
  const size = String(row.size || row.selected_size || "").trim();
  const colour = String(row.colour || row.color || row.selected_color || "").trim();
  const barcode = String(row.barcode || row.ean_code || row.eanCode || "").trim();

  const actualProductId = row.product_id || row.productId || row.actual_product_id || row.parent_product_id || null;
  const actualVariantId = row.variant_id || row.variantId || row.id || null;
  const id = String(actualVariantId || barcode || actualProductId || "");

  const mrp = toNumber(row.mrp || row.original_price_b2c || row.originalPrice || row.price, 0);
  const salePrice = toNumber(row.sale_price || row.final_price_b2c || row.price || row.salePrice, mrp);
  const onHand = toNumber(row.on_hand || row.stock || row.qty || row.quantity, 0);

  const rawImages = parseImages(row.images);
  const frontFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("front")),
  );
  const backFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("back")),
  );
  const mainFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("main")),
  );

  const frontImageUrl = String(row.front_image_url || row.frontImageUrl || frontFromArray || "").trim();
  const backImageUrl = String(row.back_image_url || row.backImageUrl || backFromArray || "").trim();
  const mainImageUrl = String(row.main_image_url || row.mainImageUrl || mainFromArray || "").trim();
  const imageUrl = String(row.image_url || row.imageUrl || frontImageUrl || mainImageUrl || "").trim();

  const images = uniqueStrings([
    frontImageUrl,
    backImageUrl,
    mainImageUrl,
    imageUrl,
    ...rawImages.map(imageUrlFromRecord),
  ]);

  return {
    id,
    productId: actualProductId || undefined,
    variantId: actualVariantId || id,
    title: productName,
    description: String(row.description || `${brandName} ${productName}`).trim(),
    brand: brandName,
    gender,
    categoryId: String(row.category_id || row.categoryId || findCategoryId(gender, productName)),
    price: salePrice,
    originalPrice: mrp,
    isSale: mrp > salePrice,
    images: images.length ? images : ["/placeholder.svg"],
    frontImageUrl,
    backImageUrl,
    mainImageUrl,
    imageUrl,
    barcode,
    size,
    colour,
    sizes: uniqueStrings([size]),
    colors: uniqueStrings([colour]),
    stockBySize: size ? { [size]: onHand } : {},
    specs: {
      material: row.material || "",
      fit: row.fit || "",
      washCare: [],
    },
    ratings: {
      average: toNumber(row.rating_average || row.rating || 4.5, 4.5),
      count: toNumber(row.rating_count || row.reviews || 0, 0),
    },
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
    onHand,
    mrp,
    salePrice,
    patternCode: String(row.pattern_code || row.patternCode || "").trim(),
    raw: row,
  };
};

export const fetchBranchProducts = async (branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  const res = await fetch(`${API_BASE}/api/branch/${encodeURIComponent(branchId)}/stock`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data?.message || "Unable to load products");
  }

  return Array.isArray(data) ? data.map(normalizeProduct).filter((product) => product.id) : [];
};

export const fetchProductsByGender = async (
  gender: ProductGender,
  branchId = DEFAULT_BRANCH_ID,
): Promise<Product[]> => {
  const products = await fetchBranchProducts(branchId);
  return products.filter((product) => product.gender.toLowerCase() === gender.toLowerCase());
};

export const fetchProductById = async (
  id: string | number,
  branchId = DEFAULT_BRANCH_ID,
): Promise<Product | null> => {
  const products = await fetchBranchProducts(branchId);
  const target = String(id || "").trim();

  return (
    products.find((product) => String(product.id || "").trim() === target) ||
    products.find((product) => String(product.variantId || "").trim() === target) ||
    products.find((product) => String(product.barcode || "").trim() === target) ||
    products.find((product) => String(product.productId || "").trim() === target) ||
    null
  );
};