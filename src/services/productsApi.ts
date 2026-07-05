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

const splitValues = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitValues(item))
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const uniqueStrings = (items: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item) => {
    const value = String(item || "").trim();
    if (!value || value === "[object Object]") return;

    const key = value.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    out.push(value);
  });

  return out;
};

const sortVariantValues = (items: any[]) => {
  return uniqueStrings(items).sort((a, b) => {
    const na = parseFloat(String(a).replace(/[^\d.]/g, ""));
    const nb = parseFloat(String(b).replace(/[^\d.]/g, ""));

    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;

    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
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
    { keys: ["night dress"], targets: ["night dress", "nightwear", "sleepwear"] },
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

const getRawVariants = (row: any) => {
  if (Array.isArray(row?.variants) && row.variants.length) return row.variants;
  return [row];
};

const getRowGroupKey = (row: any) => {
  const productId = String(row?.product_id || row?.productId || "").trim();
  if (productId) return `product:${productId}`;

  const name = normalizeText(row?.product_name || row?.name || row?.title || "");
  const brand = normalizeText(row?.brand_name || row?.brand || "");
  const gender = normalizeText(row?.gender || "");
  const pattern = normalizeText(row?.pattern_code || row?.patternCode || "");
  const fit = normalizeText(row?.fit_type || row?.fitType || "");
  const mark = normalizeText(row?.mark_code || row?.markCode || "");

  if (name || brand) return `details:${gender}|${brand}|${name}|${pattern}|${fit}|${mark}`;

  return `id:${String(row?.id || row?.barcode || row?.ean_code || "").trim()}`;
};

const getVariantMergeKey = (variant: any, row: any) => {
  const barcode = String(variant?.barcode || variant?.ean_code || variant?.eanCode || row?.barcode || row?.ean_code || "").trim();
  if (barcode) return `barcode:${barcode.toLowerCase()}`;

  const id = String(variant?.variant_id || variant?.variantId || variant?.id || row?.variant_id || row?.variantId || "").trim();
  if (id) return `variant:${id}`;

  const size = String(variant?.size || row?.size || "").trim().toLowerCase();
  const colour = String(variant?.colour || variant?.color || row?.colour || row?.color || "").trim().toLowerCase();

  return `combo:${size}|${colour}`;
};

const mergeRawRows = (rows: any[]) => {
  const groups = new Map<string, any>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const key = getRowGroupKey(row);

    if (!groups.has(key)) {
      groups.set(key, {
        ...row,
        variants: [],
        _variantMap: new Map<string, any>(),
      });
    }

    const group = groups.get(key);

    const rowImages = uniqueStrings([
      row?.front_image_url,
      row?.frontImageUrl,
      row?.back_image_url,
      row?.backImageUrl,
      row?.main_image_url,
      row?.mainImageUrl,
      row?.image_url,
      row?.imageUrl,
      ...parseImages(row?.images).map(imageUrlFromRecord),
    ]);

    group.images = uniqueStrings([...(group.images || []), ...rowImages]);

    for (const variant of getRawVariants(row)) {
      const variantKey = getVariantMergeKey(variant, row);

      const mergedVariant = {
        ...row,
        ...variant,
        product_id: variant?.product_id || variant?.productId || row?.product_id || row?.productId || row?.id,
        productId: variant?.productId || variant?.product_id || row?.productId || row?.product_id || row?.id,
        variant_id: variant?.variant_id || variant?.variantId || variant?.id || row?.variant_id || row?.variantId,
        variantId: variant?.variantId || variant?.variant_id || variant?.id || row?.variantId || row?.variant_id,
        barcode: variant?.barcode || variant?.ean_code || variant?.eanCode || row?.barcode || row?.ean_code || row?.eanCode || "",
        ean_code: variant?.ean_code || variant?.barcode || variant?.eanCode || row?.ean_code || row?.barcode || row?.eanCode || "",
        size: variant?.size || row?.size || "",
        colour: variant?.colour || variant?.color || row?.colour || row?.color || "",
        color: variant?.color || variant?.colour || row?.color || row?.colour || "",
        image_url: variant?.image_url || variant?.imageUrl || row?.image_url || row?.imageUrl || "",
        front_image_url: variant?.front_image_url || variant?.frontImageUrl || row?.front_image_url || row?.frontImageUrl || "",
        back_image_url: variant?.back_image_url || variant?.backImageUrl || row?.back_image_url || row?.backImageUrl || "",
        main_image_url: variant?.main_image_url || variant?.mainImageUrl || row?.main_image_url || row?.mainImageUrl || "",
      };

      if (!group._variantMap.has(variantKey)) {
        group._variantMap.set(variantKey, mergedVariant);
      } else {
        group._variantMap.set(variantKey, {
          ...group._variantMap.get(variantKey),
          ...mergedVariant,
        });
      }
    }
  }

  return Array.from(groups.values()).map((group) => {
    const variants = Array.from(group._variantMap.values());
    delete group._variantMap;
    return {
      ...group,
      variants,
      variant_count: variants.length,
      variantCount: variants.length,
    };
  });
};

const normalizeVariant = (variant: any, row: any) => {
  const productId = variant?.product_id || variant?.productId || row?.product_id || row?.productId || row?.id || null;
  const variantId = variant?.variant_id || variant?.variantId || variant?.id || row?.variant_id || row?.variantId || row?.primary_variant_id || null;
  const size = String(variant?.size || variant?.selected_size || "").trim();
  const colour = String(variant?.colour || variant?.color || variant?.selected_color || "").trim();
  const barcode = String(variant?.barcode || variant?.ean_code || variant?.eanCode || "").trim();

  const mrp = toNumber(
    variant?.mrp ??
      variant?.original_price_b2c ??
      variant?.originalPrice ??
      row?.mrp ??
      row?.original_price_b2c ??
      row?.originalPrice ??
      row?.price,
    0,
  );

  const salePrice = toNumber(
    variant?.final_price_b2c ??
      variant?.sale_price ??
      variant?.price ??
      variant?.selling_price ??
      variant?.discounted_price ??
      variant?.mahaveer_price ??
      row?.final_price_b2c ??
      row?.sale_price ??
      row?.price ??
      row?.salePrice,
    mrp,
  );

  const rawImages = parseImages(variant?.images);
  const frontFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("front")),
  );
  const backFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("back")),
  );
  const mainFromArray = imageUrlFromRecord(
    rawImages.find((img) => normalizeText(img?.image_type).includes("main")),
  );

  const frontImageUrl = String(variant?.front_image_url || variant?.frontImageUrl || frontFromArray || "").trim();
  const backImageUrl = String(variant?.back_image_url || variant?.backImageUrl || backFromArray || "").trim();
  const mainImageUrl = String(variant?.main_image_url || variant?.mainImageUrl || mainFromArray || "").trim();
  const imageUrl = String(variant?.image_url || variant?.imageUrl || frontImageUrl || mainImageUrl || row?.image_url || row?.imageUrl || "").trim();

  const images = uniqueStrings([
    frontImageUrl,
    backImageUrl,
    mainImageUrl,
    imageUrl,
    ...rawImages.map(imageUrlFromRecord),
  ]);

  const onHand = toNumber(
    variant?.on_hand ??
      variant?.onHand ??
      variant?.stock ??
      variant?.qty ??
      variant?.quantity ??
      row?.on_hand ??
      row?.onHand ??
      row?.stock ??
      0,
    0,
  );

  const availableQty = toNumber(
    variant?.available_qty ??
      variant?.availableQty ??
      onHand,
    onHand,
  );

  return {
    id: String(variantId || barcode || ""),
    variant_id: variantId,
    variantId,
    product_id: productId,
    productId,
    size,
    colour,
    color: colour,
    barcode,
    ean_code: barcode,
    eanCode: barcode,
    mrp,
    original_price_b2c: toNumber(variant?.original_price_b2c ?? variant?.mrp ?? mrp, mrp),
    final_price_b2c: salePrice,
    original_price_b2b: toNumber(variant?.original_price_b2b ?? variant?.mrp ?? mrp, mrp),
    final_price_b2b: toNumber(variant?.final_price_b2b ?? variant?.cost_price ?? variant?.sale_price ?? salePrice, salePrice),
    sale_price: salePrice,
    price: salePrice,
    selling_price: toNumber(variant?.selling_price ?? salePrice, salePrice),
    discounted_price: toNumber(variant?.discounted_price ?? salePrice, salePrice),
    mahaveer_price: toNumber(variant?.mahaveer_price ?? salePrice, salePrice),
    base_sale_price: toNumber(variant?.base_sale_price ?? variant?.original_sale_price ?? variant?.sale_price ?? salePrice, salePrice),
    original_sale_price: toNumber(variant?.original_sale_price ?? variant?.base_sale_price ?? variant?.sale_price ?? salePrice, salePrice),
    cost_price: toNumber(variant?.cost_price ?? 0, 0),
    b2c_discount_pct: toNumber(variant?.b2c_discount_pct ?? row?.b2c_discount_pct ?? 0, 0),
    b2b_discount_pct: toNumber(variant?.b2b_discount_pct ?? row?.b2b_discount_pct ?? 0, 0),
    on_hand: onHand,
    reserved: toNumber(variant?.reserved ?? 0, 0),
    available_qty: availableQty,
    in_stock: variant?.in_stock === undefined ? availableQty > 0 : Boolean(variant?.in_stock),
    image_url: imageUrl,
    imageUrl,
    front_image_url: frontImageUrl,
    frontImageUrl,
    back_image_url: backImageUrl,
    backImageUrl,
    main_image_url: mainImageUrl,
    mainImageUrl,
    images: images.length ? images : [],
    raw: variant,
  };
};

const normalizeProduct = (row: any): Product => {
  const productName = String(row.product_name || row.name || row.title || "Product").trim();
  const brandName = String(row.brand_name || row.brand || "Vandhana").trim();
  const gender = toGender(row.gender);

  const actualProductId = row.product_id || row.productId || row.actual_product_id || row.parent_product_id || row.id || null;
  const actualVariantId = row.variant_id || row.variantId || row.primary_variant_id || null;
  const barcode = String(row.barcode || row.ean_code || row.eanCode || "").trim();

  const rawVariants = Array.isArray(row.variants) && row.variants.length ? row.variants : [row];
  const allVariants = rawVariants.map((variant: any) => normalizeVariant(variant, row));
  const availableVariants = allVariants.filter((variant: any) => toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0) > 0);
  const variants = availableVariants.length ? availableVariants : allVariants;

  const selectedVariant =
    variants.find((variant: any) => String(variant.variant_id || "") === String(actualVariantId || "")) ||
    variants[0];

  const sizeList = sortVariantValues(variants.map((variant: any) => variant.size));
  const colorList = sortVariantValues(variants.map((variant: any) => variant.colour || variant.color));

  const onHand = variants.reduce((sum: number, variant: any) => sum + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0), 0);

  const mrp = toNumber(selectedVariant?.mrp || row.mrp || row.original_price_b2c || row.originalPrice || row.price, 0);
  const salePrice = toNumber(
    selectedVariant?.final_price_b2c ||
      selectedVariant?.sale_price ||
      selectedVariant?.price ||
      row.final_price_b2c ||
      row.sale_price ||
      row.price ||
      row.salePrice,
    mrp,
  );

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

  const frontImageUrl = String(row.front_image_url || row.frontImageUrl || selectedVariant?.front_image_url || frontFromArray || "").trim();
  const backImageUrl = String(row.back_image_url || row.backImageUrl || selectedVariant?.back_image_url || backFromArray || "").trim();
  const mainImageUrl = String(row.main_image_url || row.mainImageUrl || selectedVariant?.main_image_url || mainFromArray || "").trim();
  const imageUrl = String(row.image_url || row.imageUrl || selectedVariant?.image_url || frontImageUrl || mainImageUrl || "").trim();

  const variantImages = variants.flatMap((variant: any) => [
    variant.image_url,
    variant.front_image_url,
    variant.back_image_url,
    variant.main_image_url,
    ...parseImages(variant.images).map(imageUrlFromRecord),
  ]);

  const images = uniqueStrings([
    frontImageUrl,
    backImageUrl,
    mainImageUrl,
    imageUrl,
    ...rawImages.map(imageUrlFromRecord),
    ...variantImages,
  ]);

  const stockBySize = variants.reduce((acc: Record<string, number>, variant: any) => {
    const size = String(variant.size || "").trim();
    if (!size) return acc;
    acc[size] = (acc[size] || 0) + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0);
    return acc;
  }, {});

  const normalized: any = {
    id: String(actualProductId || selectedVariant?.product_id || selectedVariant?.productId || selectedVariant?.variant_id || barcode || ""),
    productId: actualProductId || selectedVariant?.product_id || selectedVariant?.productId || undefined,
    variantId: selectedVariant?.variant_id || selectedVariant?.variantId || actualVariantId || undefined,
    primaryVariantId: row.primary_variant_id || actualVariantId || selectedVariant?.variant_id || undefined,
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
    barcode: selectedVariant?.barcode || barcode,
    size: selectedVariant?.size || sizeList[0] || "",
    colour: selectedVariant?.colour || colorList[0] || "",
    sizes: sizeList,
    colors: colorList,
    colours: colorList,
    stockBySize,
    specs: {
      material: row.material || "",
      fit: row.fit || row.fit_type || "",
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
    variants,
    variantCount: variants.length,
    variant_count: variants.length,
    raw: row,
  };

  return normalized as Product;
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

  const groupedRows = mergeRawRows(Array.isArray(data) ? data : []);
  return groupedRows.map(normalizeProduct).filter((product) => product.id);
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
    products.find((product: any) => String(product.id || "").trim() === target) ||
    products.find((product: any) => String(product.productId || "").trim() === target) ||
    products.find((product: any) => String(product.variantId || "").trim() === target) ||
    products.find((product: any) => String(product.primaryVariantId || "").trim() === target) ||
    products.find((product: any) => String(product.barcode || "").trim() === target) ||
    products.find((product: any) =>
      Array.isArray(product.variants) &&
      product.variants.some(
        (variant: any) =>
          String(variant.variant_id || "").trim() === target ||
          String(variant.id || "").trim() === target ||
          String(variant.barcode || "").trim() === target ||
          String(variant.ean_code || "").trim() === target,
      ),
    ) ||
    null
  );
};