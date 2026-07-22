import type { Product, ProductGender, ProductImage } from "../Models/Product";
import categoriesJson from "../Data/categories.json";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";
const DEFAULT_BRANCH_ID = 3;

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  parentId: string | null;
  parent_id?: string | null;
  level: number;
  gender?: "MEN" | "WOMEN" | "KIDS";
  categoryPath?: string;
  category_path?: string;
  is_active?: boolean;
  sort_order?: number;
  children?: StorefrontCategory[];
};

type AnyRecord = Record<string, any>;

type NormalizedVariant = AnyRecord & {
  id: string | number;
  variant_id: string | number;
  variantId: string | number;
  product_id: string | number;
  productId: string | number;
  size: string;
  colour: string;
  color: string;
  barcode: string;
  ean_code: string;
  eanCode: string;
  mrp: number;
  sale_price: number;
  salePrice: number;
  price: number;
  on_hand: number;
  onHand: number;
  reserved: number;
  reserved_qty: number;
  reservedQty: number;
  available_qty: number;
  availableQty: number;
  images: string[];
};

const fallbackCategories = categoriesJson as StorefrontCategory[];
const categoryImageMap = new Map<string, string>(fallbackCategories.map((category) => [String(category.id), String(category.image || "/placeholder.svg")]));
const normalizeText = (value: any) => String(value || "").toLowerCase().replace(/&/g, "and").replace(/-/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const cleanText = (value: any) => String(value ?? "").replace(/\s+/g, " ").trim();

const toNumber = (value: any, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const firstValue = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }

  return "";
};

const clampDiscount = (value: any) => Math.min(100, Math.max(0, toNumber(value, 0)));
const roundMoney = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculateDiscountedPrice = (price: any, discount: any, fallback = 0) => {
  const base = toNumber(price, fallback);
  const percentage = clampDiscount(discount);

  if (!base) return toNumber(fallback, 0);

  return percentage ? roundMoney(base - (base * percentage) / 100) : base;
};

const cleanSingleValue = (value: any) => {
  const result = cleanText(value);

  if (!result || result === "[object Object]" || result.includes(",") || result.split(/\s+/).length > 6) return "";

  return result;
};

const normalizeColorDisplay = (value: any) => {
  const raw = cleanSingleValue(value);

  if (!raw) return "";

  const key = normalizeText(raw);

  const fixes: Record<string, string> = {
    "dark bblue": "DARK BLUE",
    darkblue: "DARK BLUE",
    "dark blu": "DARK BLUE",
    "dark bluee": "DARK BLUE",
    "sea blu": "SEA BLUE",
    seablue: "SEA BLUE",
    "see blue": "SEA BLUE",
    iceblue: "ICE BLUE",
    "ice blu": "ICE BLUE",
    "navy b": "NAVY BLUE",
    navyb: "NAVY BLUE",
    "navy blu": "NAVY BLUE",
    navyblue: "NAVY BLUE",
    horizonblue: "HORIZON BLUE",
    "horizon blu": "HORIZON BLUE",
    offwhite: "OFF WHITE",
    "off white": "OFF WHITE",
  };

  return fixes[key] || raw;
};

const toGender = (value: any): ProductGender => {
  const gender = normalizeText(value);

  if (gender.includes("women")) return "Women";
  if (gender.includes("kid") || gender.includes("boy") || gender.includes("girl")) return "Kids";

  return "Men";
};

const toBackendGender = (gender: ProductGender | string) => {
  const value = normalizeText(gender);

  if (value === "women") return "WOMEN";
  if (value === "kids" || value === "kid") return "KIDS";

  return "MEN";
};

const imageUrlFromRecord = (image: any) => {
  if (!image) return "";
  if (typeof image === "string") return image.trim();

  return cleanText(image.image_url || image.imageUrl || image.secure_url || image.url || "");
};

const isGoodImage = (value: any) => {
  const image = cleanText(value).toLowerCase();
  return Boolean(image && image !== "[object object]" && !image.includes("undefined") && !image.includes("null") && !image.includes("placeholder.svg"));
};

const uniqueImages = (values: any[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const image = imageUrlFromRecord(value);
    const key = image.toLowerCase();

    if (!isGoodImage(image) || seen.has(key)) return;

    seen.add(key);
    output.push(image);
  });

  return output;
};

const parseImages = (value: any): ProductImage[] => {
  if (!value) return [];

  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? ({ image_url: item } as ProductImage) : item).filter(Boolean);

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => typeof item === "string" ? ({ image_url: item } as ProductImage) : item).filter(Boolean) : [];
  } catch {
    return /^https?:\/\//i.test(value) || value.startsWith("/") ? [{ image_url: value } as ProductImage] : [];
  }
};

const imageByType = (images: any[], types: string[]) => {
  const targets = types.map(normalizeText).filter(Boolean);

  const found = images.find((image) => {
    const type = normalizeText(image?.image_type || image?.imageType || image?.type || image?.label || image?.name || image?.view || image?.position);
    return targets.some((target) => type === target || type.includes(target));
  });

  return imageUrlFromRecord(found);
};

const getImagePairFromSource = (source: any) => {
  const raw = parseImages(source?.images);
  const front = imageUrlFromRecord(source?.front_image_url || source?.frontImageUrl || source?.front_url || source?.frontUrl || imageByType(raw, ["front", "primary"]) || source?.main_image_url || source?.mainImageUrl || source?.image_url || source?.imageUrl || imageByType(raw, ["main", "default"]) || raw[0]);
  const back = imageUrlFromRecord(source?.back_image_url || source?.backImageUrl || source?.back_url || source?.backUrl || source?.rear_image_url || source?.rearImageUrl || imageByType(raw, ["back", "rear"]));

  return uniqueImages([front, back]).slice(0, 2);
};

const getInventory = (source: any, fallback: any = {}) => {
  const value = (...keys: string[]) => {
    for (const record of [source || {}, fallback || {}]) {
      for (const key of keys) {
        const candidate = record?.[key];

        if (candidate !== undefined && candidate !== null && String(candidate).trim() !== "" && Number.isFinite(Number(candidate))) return Number(candidate);
      }
    }

    return null;
  };

  const reserved = Math.max(0, value("reserved", "reserved_qty", "reservedQty", "reserved_stock", "reservedStock") ?? 0);
  const explicitAvailable = value("available_qty", "availableQty", "available", "available_stock", "availableStock");
  const explicitOnHand = value("on_hand", "onHand", "stock", "quantity", "qty", "inventory_qty", "inventoryQty");
  const available = Math.max(0, explicitAvailable ?? (explicitOnHand !== null ? explicitOnHand - reserved : 0));
  const onHand = Math.max(0, explicitOnHand ?? available + reserved);

  return { onHand, reserved, available };
};

const getVariantId = (variant: any, row: any = {}) => firstValue(variant?.variant_id, variant?.variantId, variant?.id, row?.variant_id, row?.variantId, row?.primary_variant_id, row?.primaryVariantId);
const getVariantBarcode = (variant: any, row: any = {}) => cleanText(firstValue(variant?.barcode, variant?.ean_code, variant?.eanCode, row?.barcode, row?.ean_code, row?.eanCode));
const getVariantColor = (variant: any, row: any = {}) => normalizeColorDisplay(firstValue(variant?.colour, variant?.color, variant?.selected_colour, variant?.selectedColor, variant?.selected_color, row?.colour, row?.color, row?.selected_colour, row?.selectedColor, row?.selected_color, row?.display_color, row?.displayColor));
const getVariantSize = (variant: any, row: any = {}) => cleanSingleValue(firstValue(variant?.size, variant?.selected_size, variant?.selectedSize, row?.size, row?.selected_size, row?.selectedSize));
const getB2CDiscount = (variant: any, row: any) => clampDiscount(firstValue(variant?.b2c_discount_pct, variant?.b2cDiscountPct, variant?.discount_b2c, variant?.discountB2c, variant?.b2c_discount, variant?.discount_percentage, variant?.discount_percent, variant?.discount, row?.b2c_discount_pct, row?.b2cDiscountPct, row?.discount_b2c, row?.discountB2c, row?.b2c_discount, row?.discount_percentage, row?.discount_percent, row?.discount, 0));
const getB2BDiscount = (variant: any, row: any) => clampDiscount(firstValue(variant?.b2b_discount_pct, variant?.b2bDiscountPct, variant?.discount_b2b, variant?.discountB2b, variant?.b2b_discount, row?.b2b_discount_pct, row?.b2bDiscountPct, row?.discount_b2b, row?.discountB2b, row?.b2b_discount, 0));

const normalizeVariant = (variant: any, row: any): NormalizedVariant => {
  const productId = firstValue(variant?.product_id, variant?.productId, row?.product_id, row?.productId, row?.id, "");
  const variantId = getVariantId(variant, row) || "";
  const size = getVariantSize(variant, row);
  const colour = getVariantColor(variant, row);
  const barcode = getVariantBarcode(variant, row);
  const b2cDiscount = getB2CDiscount(variant, row);
  const b2bDiscount = getB2BDiscount(variant, row);
  const mrp = toNumber(firstValue(variant?.original_price_b2c, variant?.originalPriceB2c, variant?.mrp, variant?.original_price, row?.original_price_b2c, row?.originalPriceB2c, row?.mrp, row?.original_price, row?.price, 0), 0);
  const directSalePrice = toNumber(firstValue(variant?.final_price_b2c, variant?.finalPriceB2c, variant?.b2c_final_price, variant?.sale_price, variant?.salePrice, variant?.price, variant?.selling_price, variant?.discounted_price, variant?.mahaveer_price, row?.final_price_b2c, row?.finalPriceB2c, row?.b2c_final_price, row?.sale_price, row?.salePrice, row?.price, row?.selling_price, row?.discounted_price, row?.mahaveer_price, mrp), mrp);
  const salePrice = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directSalePrice) : directSalePrice;
  const originalB2B = toNumber(firstValue(variant?.original_price_b2b, variant?.cost_price, row?.original_price_b2b, row?.cost_price, mrp), mrp);
  const finalB2B = b2bDiscount > 0 && originalB2B > 0 ? calculateDiscountedPrice(originalB2B, b2bDiscount, originalB2B) : originalB2B;
  const inventory = getInventory(variant, row);
  const variantImages = getImagePairFromSource(variant);
  const rowImages = getImagePairFromSource(row);
  const images = uniqueImages([variantImages[0] || rowImages[0], variantImages[1] || rowImages[1]]).slice(0, 2);
  const imageUrl = images[0] || "";
  const categoryId = cleanText(firstValue(variant?.category_id, variant?.categoryId, row?.category_id, row?.categoryId, ""));
  const categoryName = cleanText(firstValue(variant?.category_name, variant?.categoryName, row?.category_name, row?.categoryName, ""));
  const categorySlug = cleanText(firstValue(variant?.category_slug, variant?.categorySlug, row?.category_slug, row?.categorySlug, ""));
  const parentCategoryId = cleanText(firstValue(variant?.parent_category_id, variant?.parentCategoryId, row?.parent_category_id, row?.parentCategoryId, ""));
  const parentCategoryName = cleanText(firstValue(variant?.parent_category_name, variant?.parentCategoryName, row?.parent_category_name, row?.parentCategoryName, ""));
  const parentCategorySlug = cleanText(firstValue(variant?.parent_category_slug, variant?.parentCategorySlug, row?.parent_category_slug, row?.parentCategorySlug, ""));
  const categoryPath = cleanText(firstValue(variant?.category_path, variant?.categoryPath, row?.category_path, row?.categoryPath, [parentCategoryName, categoryName].filter(Boolean).join(" > ")));
  const colorValue = cleanText(firstValue(variant?.colour_hex, variant?.color_hex, variant?.colourHex, variant?.colorHex, variant?.swatch_color, variant?.swatchColor, row?.colour_hex, row?.color_hex, row?.colourHex, row?.colorHex, row?.swatch_color, row?.swatchColor, ""));

  return {
    id: variantId || barcode,
    variant_id: variantId,
    variantId,
    product_id: productId,
    productId,
    category_id: categoryId,
    categoryId,
    category_name: categoryName,
    categoryName,
    category_slug: categorySlug,
    categorySlug,
    parent_category_id: parentCategoryId,
    parentCategoryId,
    parent_category_name: parentCategoryName,
    parentCategoryName,
    parent_category_slug: parentCategorySlug,
    parentCategorySlug,
    category_path: categoryPath,
    categoryPath,
    size,
    colour,
    color: colour,
    colour_hex: colorValue,
    color_hex: colorValue,
    colourHex: colorValue,
    colorHex: colorValue,
    swatch_color: colorValue,
    swatchColor: colorValue,
    barcode,
    ean_code: barcode,
    eanCode: barcode,
    mrp,
    original_price_b2c: mrp,
    originalPriceB2c: mrp,
    final_price_b2c: salePrice,
    finalPriceB2c: salePrice,
    sale_price: salePrice,
    salePrice,
    price: salePrice,
    selling_price: salePrice,
    sellingPrice: salePrice,
    discounted_price: salePrice,
    discountedPrice: salePrice,
    mahaveer_price: salePrice,
    mahaveerPrice: salePrice,
    original_price_b2b: originalB2B,
    final_price_b2b: finalB2B,
    cost_price: originalB2B,
    b2c_discount_pct: b2cDiscount,
    b2cDiscountPct: b2cDiscount,
    b2b_discount_pct: b2bDiscount,
    b2bDiscountPct: b2bDiscount,
    discount_b2c: b2cDiscount,
    discountB2c: b2cDiscount,
    discount_b2b: b2bDiscount,
    discountB2b: b2bDiscount,
    discount: b2cDiscount,
    discount_percentage: b2cDiscount,
    discount_percent: b2cDiscount,
    on_hand: inventory.onHand,
    onHand: inventory.onHand,
    reserved: inventory.reserved,
    reserved_qty: inventory.reserved,
    reservedQty: inventory.reserved,
    available_qty: inventory.available,
    availableQty: inventory.available,
    in_stock: inventory.available > 0,
    inStock: inventory.available > 0,
    image_url: imageUrl,
    imageUrl,
    front_image_url: images[0] || "",
    frontImageUrl: images[0] || "",
    back_image_url: images[1] || "",
    backImageUrl: images[1] || "",
    main_image_url: images[0] || "",
    mainImageUrl: images[0] || "",
    images,
    raw: variant,
  };
};

const getRawVariants = (row: any): any[] => {
  if (Array.isArray(row?.variants) && row.variants.length) return row.variants;
  if (Array.isArray(row?.color_variants) && row.color_variants.length) return row.color_variants;
  if (Array.isArray(row?.colorVariants) && row.colorVariants.length) return row.colorVariants;

  return [row];
};

const variantKey = (variant: any) => {
  const id = cleanText(firstValue(variant?.variant_id, variant?.variantId, variant?.id));

  if (id) return `id:${id}`;

  const barcode = cleanText(firstValue(variant?.barcode, variant?.ean_code, variant?.eanCode));

  if (barcode) return `barcode:${barcode.toLowerCase()}`;

  return [normalizeText(variant?.colour || variant?.color), normalizeText(variant?.size), normalizeText(variant?.product_id || variant?.productId)].join("|");
};

const rawProductKey = (row: any) => {
  const productId = cleanText(firstValue(row?.product_id, row?.productId));
  const categoryId = cleanText(firstValue(row?.category_id, row?.categoryId));

  if (productId) return `product:${productId}|category:${categoryId || "none"}`;

  return ["product", normalizeText(row?.gender || row?.category), categoryId, normalizeText(row?.brand_name || row?.brandName || row?.brand), normalizeText(row?.product_name || row?.productName || row?.name || row?.title), normalizeText(row?.pattern_code || row?.patternCode)].join("|");
};

const mergeRawRows = (rows: any[]) => {
  const groups = new Map<string, { base: any; variants: Map<string, any> }>();

  rows.forEach((row) => {
    const key = rawProductKey(row);

    if (!groups.has(key)) groups.set(key, { base: { ...row }, variants: new Map<string, any>() });

    const group = groups.get(key)!;

    Object.entries(row || {}).forEach(([field, value]) => {
      const current = group.base[field];
      const currentMissing = current === undefined || current === null || current === "" || Array.isArray(current) && !current.length;
      const nextPresent = value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);

      if (currentMissing && nextPresent) group.base[field] = value;
    });

    getRawVariants(row).forEach((variant: any) => {
      const keyValue = variantKey(variant);
      const existing = group.variants.get(keyValue);
      group.variants.set(keyValue, existing ? { ...existing, ...variant } : variant);
    });
  });

  return Array.from(groups.values()).map((group) => ({ ...group.base, variants: Array.from(group.variants.values()) }));
};

const uniqueStrings = (values: any[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const clean = cleanSingleValue(value);
    const key = clean.toLowerCase();

    if (!clean || seen.has(key)) return;

    seen.add(key);
    output.push(clean);
  });

  return output;
};

const sortVariantValues = (values: any[]) => uniqueStrings(values).sort((first, second) => {
  const firstNumber = Number(String(first).replace(/[^\d.]/g, ""));
  const secondNumber = Number(String(second).replace(/[^\d.]/g, ""));

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) return firstNumber - secondNumber;

  return String(first).localeCompare(String(second), undefined, { numeric: true });
});

const sameColor = (a: any, b: any) => normalizeText(a) === normalizeText(b);

const normalizeProductCards = (row: any): Product[] => {
  const variants: NormalizedVariant[] = getRawVariants(row).map((variant: any) => normalizeVariant(variant, row)).filter((variant: NormalizedVariant) => variant.variant_id || variant.barcode || variant.size || variant.colour);
  const usableVariants = variants.some((variant: NormalizedVariant) => variant.available_qty > 0) ? variants.filter((variant: NormalizedVariant) => variant.available_qty > 0) : variants;
  const colors = uniqueStrings(usableVariants.map((variant: NormalizedVariant) => variant.colour));
  const groups = colors.length ? colors.map((color) => ({ color, variants: usableVariants.filter((variant: NormalizedVariant) => sameColor(variant.colour, color)) })) : [{ color: "", variants: usableVariants }];
  const productName = cleanText(row.product_name || row.productName || row.name || row.title || "Product");
  const brandName = cleanText(row.brand_name || row.brandName || row.brand || "Vandhana");
  const gender = toGender(row.gender || row.category);
  const actualProductId = firstValue(row.product_id, row.productId, row.id, "");
  const allSizes = sortVariantValues(variants.map((variant: NormalizedVariant) => variant.size));
  const allColors = sortVariantValues(variants.map((variant: NormalizedVariant) => variant.colour));

  return groups.map(({ color, variants: selectedGroup }) => {
    const selectedVariant = selectedGroup.find((variant: NormalizedVariant) => variant.images.length) || selectedGroup[0] || variants[0];

    const inventory = selectedGroup.reduce((totals: { onHand: number; reserved: number; available: number }, variant: NormalizedVariant) => ({
      onHand: totals.onHand + variant.on_hand,
      reserved: totals.reserved + variant.reserved,
      available: totals.available + variant.available_qty,
    }), { onHand: 0, reserved: 0, available: 0 });

    const images = selectedGroup.reduce((result: string[], variant: NormalizedVariant) => {
      if (!result[0] && variant.images[0]) result[0] = variant.images[0];
      if (!result[1] && variant.images[1]) result[1] = variant.images[1];
      return result;
    }, []).filter(Boolean).slice(0, 2);

    const fallbackImages = getImagePairFromSource(row);
    const finalImages = (images.length ? images : fallbackImages).slice(0, 2);
    const imageUrl = finalImages[0] || "/placeholder.svg";
    const mrp = selectedVariant?.mrp || 0;
    const salePrice = selectedVariant?.sale_price || mrp;
    const b2cDiscount = selectedVariant?.b2c_discount_pct || 0;
    const sizes = sortVariantValues(selectedGroup.map((variant: NormalizedVariant) => variant.size));

    const stockBySize = selectedGroup.reduce((accumulator: Record<string, number>, variant: NormalizedVariant) => {
      if (variant.size) accumulator[variant.size] = (accumulator[variant.size] || 0) + variant.available_qty;
      return accumulator;
    }, {});

    const cardId = cleanText(firstValue(selectedVariant?.variant_id, selectedVariant?.barcode, row?.id, actualProductId));
    const categoryId = cleanText(firstValue(selectedVariant?.category_id, row.category_id, row.categoryId, ""));
    const categoryName = cleanText(firstValue(selectedVariant?.category_name, row.category_name, row.categoryName, ""));
    const categorySlug = cleanText(firstValue(selectedVariant?.category_slug, row.category_slug, row.categorySlug, ""));
    const parentCategoryId = cleanText(firstValue(selectedVariant?.parent_category_id, row.parent_category_id, row.parentCategoryId, ""));
    const parentCategoryName = cleanText(firstValue(selectedVariant?.parent_category_name, row.parent_category_name, row.parentCategoryName, ""));
    const parentCategorySlug = cleanText(firstValue(selectedVariant?.parent_category_slug, row.parent_category_slug, row.parentCategorySlug, ""));
    const categoryPath = cleanText(firstValue(selectedVariant?.category_path, row.category_path, row.categoryPath, [parentCategoryName, categoryName].filter(Boolean).join(" > ")));

    const normalized = {
      id: cardId,
      productId: actualProductId || selectedVariant?.product_id,
      product_id: actualProductId || selectedVariant?.product_id,
      variantId: selectedVariant?.variant_id,
      variant_id: selectedVariant?.variant_id,
      primaryVariantId: selectedVariant?.variant_id,
      primary_variant_id: selectedVariant?.variant_id,
      title: productName,
      product_name: productName,
      name: productName,
      description: cleanText(row.description || `${brandName} ${productName}`),
      brand: brandName,
      brand_name: brandName,
      gender,
      category: gender,
      categoryId,
      category_id: categoryId,
      categoryName,
      category_name: categoryName,
      categorySlug,
      category_slug: categorySlug,
      parentCategoryId,
      parent_category_id: parentCategoryId,
      parentCategoryName,
      parent_category_name: parentCategoryName,
      parentCategorySlug,
      parent_category_slug: parentCategorySlug,
      categoryPath,
      category_path: categoryPath,
      price: salePrice,
      salePrice,
      sale_price: salePrice,
      selling_price: salePrice,
      final_price_b2c: salePrice,
      discounted_price: salePrice,
      mahaveer_price: salePrice,
      originalPrice: mrp,
      original_price_b2c: mrp,
      mrp,
      isSale: mrp > salePrice,
      discount: b2cDiscount,
      discount_b2c: b2cDiscount,
      discount_percentage: b2cDiscount,
      discount_percent: b2cDiscount,
      b2c_discount_pct: b2cDiscount,
      images: finalImages,
      frontImageUrl: imageUrl,
      front_image_url: imageUrl,
      backImageUrl: finalImages[1] || "",
      back_image_url: finalImages[1] || "",
      mainImageUrl: imageUrl,
      main_image_url: imageUrl,
      imageUrl,
      image_url: imageUrl,
      barcode: selectedVariant?.barcode || "",
      ean_code: selectedVariant?.ean_code || selectedVariant?.barcode || "",
      eanCode: selectedVariant?.eanCode || selectedVariant?.barcode || "",
      size: selectedVariant?.size || sizes[0] || "",
      colour: color || selectedVariant?.colour || "",
      color: color || selectedVariant?.colour || "",
      selectedColor: color || selectedVariant?.colour || "",
      selected_color: color || selectedVariant?.colour || "",
      selectedColour: color || selectedVariant?.colour || "",
      selected_colour: color || selectedVariant?.colour || "",
      sizes,
      allSizes,
      all_sizes: allSizes,
      colors: allColors,
      colours: allColors,
      stockBySize,
      specs: { material: row.material || "", fit: row.fit || row.fit_type || "", washCare: [] },
      ratings: { average: toNumber(row.rating_average || row.rating || 4.5, 4.5), count: toNumber(row.rating_count || row.reviews || 0, 0) },
      createdAt: cleanText(row.created_at || row.createdAt || new Date().toISOString()),
      created_at: cleanText(row.created_at || row.createdAt || new Date().toISOString()),
      onHand: inventory.onHand,
      on_hand: inventory.onHand,
      reserved: inventory.reserved,
      reserved_qty: inventory.reserved,
      reservedQty: inventory.reserved,
      available_qty: inventory.available,
      availableQty: inventory.available,
      in_stock: inventory.available > 0,
      inStock: inventory.available > 0,
      patternCode: cleanText(row.pattern_code || row.patternCode || ""),
      pattern_code: cleanText(row.pattern_code || row.patternCode || ""),
      variants,
      colorVariants: selectedGroup,
      color_variants: selectedGroup,
      variantCount: variants.length,
      variant_count: variants.length,
      colorVariantCount: selectedGroup.length,
      color_variant_count: selectedGroup.length,
      raw: row,
    };

    return normalized as unknown as Product;
  });
};

const getCategoryImage = (category: any) => {
  const direct = cleanText(category?.image);

  if (isGoodImage(direct)) return direct;

  return categoryImageMap.get(String(category?.id || "")) || "/placeholder.svg";
};

const flattenFallbackCategories = () => fallbackCategories.filter((category) => category?.is_active !== false).map((category) => ({
  ...category,
  id: String(category.id),
  image: getCategoryImage(category),
  parentId: category.parentId === undefined ? category.parent_id || null : category.parentId,
  parent_id: category.parent_id === undefined ? category.parentId || null : category.parent_id,
  level: Number(category.level || 0),
  children: [],
})) as StorefrontCategory[];

const flatToTree = (items: StorefrontCategory[]) => {
  const map = new Map<string, StorefrontCategory>();
  const roots: StorefrontCategory[] = [];

  items.forEach((item) => map.set(String(item.id), { ...item, children: [] }));

  map.forEach((item) => {
    const parentId = item.parentId || item.parent_id || null;

    if (parentId && map.has(String(parentId))) map.get(String(parentId))!.children!.push(item);
    else roots.push(item);
  });

  return roots;
};

const normalizeCategoryNode = (node: any, parentId: string | null = null): StorefrontCategory => {
  const id = String(node.id || "");
  const children = Array.isArray(node.children) ? node.children.map((child: any) => normalizeCategoryNode(child, id)) : [];

  return {
    id,
    name: cleanText(node.name),
    slug: cleanText(node.slug),
    image: getCategoryImage(node),
    parentId: node.parentId === undefined ? node.parent_id ?? parentId : node.parentId,
    parent_id: node.parent_id === undefined ? node.parentId ?? parentId : node.parent_id,
    level: Number(node.level || 0),
    gender: node.gender,
    categoryPath: cleanText(node.categoryPath || node.category_path || node.name),
    category_path: cleanText(node.category_path || node.categoryPath || node.name),
    is_active: node.is_active !== false,
    sort_order: Number(node.sort_order || 0),
    children,
  };
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const data = await response.json().catch(() => []);

  if (!response.ok) throw new Error(data?.message || `Request failed with status ${response.status}`);

  return data;
};

const extractRows = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

export const flattenCategoryTree = (tree: StorefrontCategory[]) => {
  const output: StorefrontCategory[] = [];

  const walk = (items: StorefrontCategory[]) => items.forEach((item) => {
    output.push(item);
    if (item.children?.length) walk(item.children);
  });

  walk(tree);

  return output;
};

export const fetchCategoriesTree = async (gender?: ProductGender | string): Promise<StorefrontCategory[]> => {
  const backendGender = gender ? toBackendGender(gender) : "";
  const url = backendGender ? `${API_BASE}/api/categories/tree?gender=${encodeURIComponent(backendGender)}&_ts=${Date.now()}` : `${API_BASE}/api/categories/tree?_ts=${Date.now()}`;

  try {
    const data = await fetchJson(url);
    return Array.isArray(data) ? data.map((node: any) => normalizeCategoryNode(node)) : [];
  } catch {
    const flat = flattenFallbackCategories();
    const filtered = backendGender ? flat.filter((item) => item.gender === backendGender) : flat;
    return flatToTree(filtered);
  }
};

export const fetchCategoriesByGender = async (gender: ProductGender): Promise<StorefrontCategory[]> => {
  const tree = await fetchCategoriesTree(gender);
  return flattenCategoryTree(tree).filter((category) => category.level > 0 && category.is_active !== false);
};

const fetchFromProductsApi = async (branchId: number) => extractRows(await fetchJson(`${API_BASE}/api/products?branch_id=${encodeURIComponent(branchId)}&all=true&_ts=${Date.now()}`));
const fetchFromBranchApi = async (branchId: number) => extractRows(await fetchJson(`${API_BASE}/api/branch/${encodeURIComponent(branchId)}/stock?_ts=${Date.now()}`));

const productIdentityKey = (product: any) => {
  const productId = cleanText(firstValue(product?.productId, product?.product_id));
  const categoryId = cleanText(firstValue(product?.categoryId, product?.category_id));
  const color = normalizeText(firstValue(product?.selectedColor, product?.selected_color, product?.selectedColour, product?.selected_colour, product?.colour, product?.color));

  if (productId) return `product:${productId}|category:${categoryId || "none"}|color:${color || "default"}`;

  return ["details", normalizeText(product?.gender || product?.category), categoryId, normalizeText(product?.brand || product?.brand_name), normalizeText(product?.title || product?.product_name || product?.name), color || "default"].join("|");
};

const dedupeProducts = (products: Product[]) => {
  const map = new Map<string, Product>();

  products.forEach((product) => {
    const key = productIdentityKey(product);

    if (!map.has(key)) map.set(key, product);
  });

  return Array.from(map.values());
};

export const productMatchesCategoryId = (product: any, categoryId: string | number) => {
  const target = cleanText(categoryId);

  if (!target) return true;

  return cleanText(product?.categoryId || product?.category_id) === target;
};

export const productMatchesCategorySlug = (product: any, slug: string) => {
  const target = normalizeText(slug);

  if (!target) return true;

  return normalizeText(product?.categorySlug || product?.category_slug) === target;
};

export const fetchBranchProducts = async (branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  let rows: any[] = [];

  try {
    rows = await fetchFromBranchApi(branchId);
  } catch {
    rows = await fetchFromProductsApi(branchId);
  }

  if (!rows.length) {
    try {
      rows = await fetchFromProductsApi(branchId);
    } catch {
      rows = [];
    }
  }

  const products = mergeRawRows(rows).flatMap((row) => normalizeProductCards(row)).filter((product) => Boolean((product as any).id));

  return dedupeProducts(products);
};

export const fetchProductsByGender = async (gender: ProductGender, branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  const products = await fetchBranchProducts(branchId);
  return products.filter((product) => String((product as any).gender || "").toLowerCase() === String(gender).toLowerCase());
};

export const fetchProductsByCategoryId = async (categoryId: string | number, branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  const products = await fetchBranchProducts(branchId);
  return products.filter((product) => productMatchesCategoryId(product, categoryId));
};

export const fetchProductsByCategorySlug = async (categorySlug: string, branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  const products = await fetchBranchProducts(branchId);
  return products.filter((product) => productMatchesCategorySlug(product, categorySlug));
};

const productContainsTarget = (product: any, target: string) => {
  const values = [product?.id, product?.variantId, product?.variant_id, product?.primaryVariantId, product?.primary_variant_id, product?.barcode, product?.ean_code, product?.eanCode, product?.productId, product?.product_id].map((value) => cleanText(value));

  if (values.includes(target)) return true;

  const variants = Array.isArray(product?.variants) ? product.variants : [];

  return variants.some((variant: any) => [variant?.id, variant?.variant_id, variant?.variantId, variant?.barcode, variant?.ean_code, variant?.eanCode].map((value) => cleanText(value)).includes(target));
};

export const fetchProductById = async (id: string | number, branchId = DEFAULT_BRANCH_ID): Promise<Product | null> => {
  const products = await fetchBranchProducts(branchId);
  const target = cleanText(id);

  return products.find((product) => productContainsTarget(product, target)) || null;
};