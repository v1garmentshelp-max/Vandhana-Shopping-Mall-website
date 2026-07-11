import type { Product, ProductGender } from "../Models/Product";
import categoriesJson from "../Data/categories.json";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";
const DEFAULT_BRANCH_ID = 3;

type AnyRecord = Record<string, any>;

type CategoryRecord = {
  id: string;
  name: string;
  parentId?: string | null;
  level: number;
  slug?: string;
};

const categories = categoriesJson as CategoryRecord[];

const normalizeText = (value: any): string =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const roundMoney = (value: number): number =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const clampDiscount = (value: any): number => {
  const n = toNumber(value, 0);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const calculateDiscountedPrice = (original: any, discount: any, fallback = 0): number => {
  const base = toNumber(original, fallback);
  const pct = clampDiscount(discount);
  if (!base) return toNumber(fallback, 0);
  if (!pct) return base;
  return roundMoney(base - (base * pct) / 100);
};

const firstValue = (...values: any[]): any => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const firstPositiveDiscount = (...values: any[]): number => {
  for (const value of values) {
    const n = clampDiscount(value);
    if (n > 0) return n;
  }
  return 0;
};

const toGender = (value: any): ProductGender => {
  const s = normalizeText(value);
  if (s.includes("women")) return "Women";
  if (s.includes("kid") || s.includes("boy") || s.includes("girl")) return "Kids";
  return "Men";
};

const isGroupedValue = (value: any): boolean => {
  const s = String(value || "").trim();
  if (!s) return false;
  if (s.includes(",")) return true;
  if (s.split(/\s+/).length > 5) return true;
  return false;
};

const cleanSingleValue = (value: any): string => {
  const s = String(value || "").trim();
  if (!s) return "";
  if (isGroupedValue(s)) return "";
  return s;
};

const imageUrlFromRecord = (image: any): string => {
  if (!image) return "";
  if (typeof image === "string") return image.trim();
  return String(image.image_url || image.imageUrl || image.secure_url || image.url || "").trim();
};

const isBadImage = (value: any): boolean => {
  const s = String(value || "").trim().toLowerCase();
  return !s || s === "[object object]" || s.includes("undefined") || s.includes("null") || s.includes("placeholder.svg");
};

const uniqueStrings = (items: any[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item: any) => {
    const value = cleanSingleValue(item);
    if (!value || value === "[object Object]") return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });

  return out;
};

const uniqueImages = (items: any[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item: any) => {
    const value = imageUrlFromRecord(item);
    if (isBadImage(value)) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });

  return out;
};

const sortVariantValues = (items: any[]): string[] => {
  return uniqueStrings(items).sort((a: string, b: string) => {
    const na = parseFloat(String(a).replace(/[^\d.]/g, ""));
    const nb = parseFloat(String(b).replace(/[^\d.]/g, ""));

    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;

    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
};

const parseImages = (value: any): AnyRecord[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
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
          .map((item: any) => {
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

const imageByType = (images: AnyRecord[], ...types: string[]): string => {
  const keys = types.map((type: string) => normalizeText(type)).filter(Boolean);
  const found = images.find((img: AnyRecord) => {
    const imageType = normalizeText(img?.image_type || img?.type || img?.label || img?.name || img?.view || img?.position);
    return keys.some((key: string) => imageType.includes(key));
  });

  return imageUrlFromRecord(found);
};

const getImagePairFromSource = (source: AnyRecord): string[] => {
  const rawImages = parseImages(source?.images);

  const front = firstValue(
    source?.front_image_url,
    source?.frontImageUrl,
    source?.image_url,
    source?.imageUrl,
    source?.main_image_url,
    source?.mainImageUrl,
    imageByType(rawImages, "front", "primary", "main"),
    rawImages[0],
  );

  const back = firstValue(
    source?.back_image_url,
    source?.backImageUrl,
    source?.rear_image_url,
    source?.rearImageUrl,
    imageByType(rawImages, "back", "rear", "hover", "secondary"),
  );

  return uniqueImages([front, back]).slice(0, 2);
};

const getRawVariants = (row: AnyRecord): AnyRecord[] => {
  if (Array.isArray(row?.variants) && row.variants.length) return row.variants as AnyRecord[];
  if (Array.isArray(row?.color_variants) && row.color_variants.length) return row.color_variants as AnyRecord[];
  if (Array.isArray(row?.colorVariants) && row.colorVariants.length) return row.colorVariants as AnyRecord[];
  return [row];
};

const getVariantId = (variant: AnyRecord, row: AnyRecord = {}): any =>
  firstValue(
    variant?.variant_id,
    variant?.variantId,
    variant?.id,
    row?.variant_id,
    row?.variantId,
    row?.primary_variant_id,
    row?.primaryVariantId,
  );

const getVariantBarcode = (variant: AnyRecord, row: AnyRecord = {}): string =>
  String(firstValue(variant?.barcode, variant?.ean_code, variant?.eanCode, row?.barcode, row?.ean_code, row?.eanCode)).trim();

const getVariantColor = (variant: AnyRecord, row: AnyRecord = {}): string =>
  cleanSingleValue(
    firstValue(
      variant?.colour,
      variant?.color,
      variant?.selected_colour,
      variant?.selectedColor,
      row?.colour,
      row?.color,
      row?.selected_colour,
      row?.selectedColor,
      row?.display_color,
      row?.displayColor,
    ),
  );

const getVariantSize = (variant: AnyRecord, row: AnyRecord = {}): string =>
  cleanSingleValue(firstValue(variant?.size, variant?.selected_size, row?.size, row?.selected_size));

const getProductKey = (row: AnyRecord): string => {
  const productId = String(firstValue(row?.product_id, row?.productId, row?.actual_product_id)).trim();
  if (productId) return productId;

  return [
    normalizeText(row?.gender || row?.category),
    normalizeText(row?.brand_name || row?.brand),
    normalizeText(row?.product_name || row?.name || row?.title),
    normalizeText(row?.pattern_code || row?.patternCode),
  ].join("|");
};

const pickSelectedVariant = (variants: AnyRecord[], row: AnyRecord, color?: string): AnyRecord => {
  const targetVariantId = String(firstValue(row?.variant_id, row?.variantId, row?.primary_variant_id, row?.primaryVariantId)).trim();
  const targetBarcode = String(firstValue(row?.barcode, row?.ean_code, row?.eanCode)).trim();
  const targetColor = normalizeText(color || getVariantColor(row, row));

  const sameColorVariants = variants.filter((variant: AnyRecord) => normalizeText(getVariantColor(variant, row)) === targetColor);
  const pool = sameColorVariants.length ? sameColorVariants : variants;

  return (
    pool.find((variant: AnyRecord) => String(getVariantId(variant, row)).trim() === targetVariantId) ||
    pool.find((variant: AnyRecord) => getVariantBarcode(variant, row) === targetBarcode) ||
    pool.find((variant: AnyRecord) => getImagePairFromSource(variant).length > 0) ||
    pool[0] ||
    row
  );
};

const expandRowToColorCards = (row: AnyRecord): AnyRecord[] => {
  const variants = getRawVariants(row);
  const groups = new Map<string, AnyRecord[]>();

  variants.forEach((variant: AnyRecord) => {
    const color = getVariantColor(variant, row) || getVariantColor(row, row) || "DEFAULT";
    const key = normalizeText(color) || "default";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(variant);
  });

  if (!groups.size) groups.set("default", [row]);

  const allColors = sortVariantValues(variants.map((variant: AnyRecord) => getVariantColor(variant, row)));
  const allSizes = sortVariantValues(variants.map((variant: AnyRecord) => getVariantSize(variant, row)));
  const allBarcodes = uniqueStrings(variants.map((variant: AnyRecord) => getVariantBarcode(variant, row)));

  return Array.from(groups.entries()).map(([colorKey, colorVariants]: [string, AnyRecord[]]) => {
    const colorName =
      getVariantColor(colorVariants[0], row) ||
      getVariantColor(row, row) ||
      colorKey;

    const selected = pickSelectedVariant(colorVariants, row, colorName);
    const selectedVariantId = getVariantId(selected, row);
    const selectedBarcode = getVariantBarcode(selected, row);
    const colorSizes = sortVariantValues(colorVariants.map((variant: AnyRecord) => getVariantSize(variant, row)));
    const colorBarcodes = uniqueStrings(colorVariants.map((variant: AnyRecord) => getVariantBarcode(variant, row)));
    const selectedImages = getImagePairFromSource(selected);
    const rowImages = getImagePairFromSource(row);
    const images = uniqueImages([...selectedImages, ...rowImages]);

    const onHand = colorVariants.reduce((sum: number, variant: AnyRecord) => {
      return sum + toNumber(firstValue(variant?.available_qty, variant?.availableQty, variant?.on_hand, variant?.onHand, 0), 0);
    }, 0);

    return {
      ...row,
      ...selected,
      id: selectedVariantId || selectedBarcode || row.id,
      product_id: firstValue(row?.product_id, row?.productId, selected?.product_id, selected?.productId),
      productId: firstValue(row?.productId, row?.product_id, selected?.productId, selected?.product_id),
      primary_variant_id: selectedVariantId,
      primaryVariantId: selectedVariantId,
      variant_id: selectedVariantId,
      variantId: selectedVariantId,
      barcode: selectedBarcode,
      ean_code: selectedBarcode,
      eanCode: selectedBarcode,
      colour: colorName,
      color: colorName,
      selected_colour: colorName,
      selectedColor: colorName,
      display_color: colorName,
      displayColor: colorName,
      size: colorSizes.join(", "),
      display_size: colorSizes.join(", "),
      displaySize: colorSizes.join(", "),
      sizes: colorSizes,
      all_sizes: allSizes,
      allSizes,
      colours: allColors,
      colors: allColors,
      barcodes: colorBarcodes,
      ean_codes: colorBarcodes,
      all_barcodes: allBarcodes,
      allBarcodes,
      on_hand: onHand,
      onHand: onHand,
      available_qty: onHand,
      availableQty: onHand,
      in_stock: onHand > 0,
      inStock: onHand > 0,
      image_url: images[0] || "",
      imageUrl: images[0] || "",
      front_image_url: images[0] || "",
      frontImageUrl: images[0] || "",
      back_image_url: images[1] || "",
      backImageUrl: images[1] || "",
      main_image_url: images[0] || "",
      mainImageUrl: images[0] || "",
      images,
      variants,
      color_variants: colorVariants,
      colorVariants: colorVariants,
      variant_count: variants.length,
      variantCount: variants.length,
      color_variant_count: colorVariants.length,
      colorVariantCount: colorVariants.length,
    };
  });
};

const dedupeColorCards = (rows: AnyRecord[]): AnyRecord[] => {
  const map = new Map<string, AnyRecord>();

  rows.forEach((row: AnyRecord) => {
    const key = [
      getProductKey(row),
      normalizeText(row?.colour || row?.color || row?.selected_colour || row?.selectedColor || row?.display_color || row?.displayColor),
    ].join("|");

    if (!map.has(key)) {
      map.set(key, row);
      return;
    }

    const current = map.get(key)!;
    const currentHasImage = !!imageUrlFromRecord(current?.front_image_url || current?.frontImageUrl || current?.image_url || current?.imageUrl);
    const nextHasImage = !!imageUrlFromRecord(row?.front_image_url || row?.frontImageUrl || row?.image_url || row?.imageUrl);

    if (!currentHasImage && nextHasImage) map.set(key, row);
  });

  return Array.from(map.values());
};

const getGenderCategoryId = (gender: ProductGender): string => {
  return categories.find((c: CategoryRecord) => c.level === 0 && normalizeText(c.name) === normalizeText(gender))?.id || "";
};

const getLeafCategoriesForGender = (gender: ProductGender): CategoryRecord[] => {
  const genderId = getGenderCategoryId(gender);
  if (!genderId) return [];

  const level1Ids = categories
    .filter((c: CategoryRecord) => c.level === 1 && String(c.parentId || "") === genderId)
    .map((c: CategoryRecord) => c.id);

  return categories.filter((c: CategoryRecord) => c.level === 2 && level1Ids.includes(String(c.parentId || "")));
};

const findCategoryId = (gender: ProductGender, productName: string): string => {
  const leafCategories = getLeafCategoriesForGender(gender);
  if (!leafCategories.length) return "";

  const name = normalizeText(productName);

  const aliases: { keys: string[]; targets: string[] }[] = [
    { keys: ["kurti"], targets: ["kurti pant sets", "kurti pant set", "co ord sets", "co-ord sets"] },
    { keys: ["beggi", "baggy", "bagge"], targets: ["beggi", "pants"] },
    { keys: ["cargo"], targets: ["cargo pants", "pants"] },
    { keys: ["oversized"], targets: ["oversized t shirts", "t shirts"] },
    { keys: ["polo"], targets: ["polo t shirts", "polos", "t shirts"] },
    { keys: ["t shirt", "tshirt"], targets: ["t shirts"] },
    { keys: ["top"], targets: ["tops", "t shirts"] },
    { keys: ["shirt"], targets: ["shirts"] },
    { keys: ["jogger"], targets: ["joggers"] },
    { keys: ["vest"], targets: ["vests"] },
    { keys: ["short"], targets: ["shorts"] },
    { keys: ["jean"], targets: ["jeans"] },
    { keys: ["pant"], targets: ["pants"] },
    { keys: ["frock"], targets: ["frocks", "dresses"] },
    { keys: ["night dress"], targets: ["night dresses"] },
    { keys: ["hoodie"], targets: ["hoodies"] },
    { keys: ["sweatshirt"], targets: ["sweatshirts"] },
  ];

  for (const alias of aliases) {
    if (alias.keys.some((key: string) => name.includes(normalizeText(key)))) {
      for (const target of alias.targets) {
        const exact = leafCategories.find((c: CategoryRecord) => normalizeText(c.name) === normalizeText(target));
        if (exact) return exact.id;

        const partial = leafCategories.find(
          (c: CategoryRecord) =>
            normalizeText(c.name).includes(normalizeText(target)) ||
            normalizeText(target).includes(normalizeText(c.name)),
        );

        if (partial) return partial.id;
      }
    }
  }

  const direct = leafCategories.find(
    (c: CategoryRecord) => name.includes(normalizeText(c.name)) || normalizeText(c.name).includes(name),
  );

  return direct?.id || leafCategories[0]?.id || "";
};

const getB2CDiscount = (variant: AnyRecord, row: AnyRecord): number => {
  const variantDiscount = firstPositiveDiscount(
    variant?.b2c_discount_pct,
    variant?.discount_b2c,
    variant?.b2c_discount,
    variant?.discount_percentage,
    variant?.discount_percent,
    variant?.discount,
  );

  if (variantDiscount > 0) return variantDiscount;

  return firstPositiveDiscount(
    row?.b2c_discount_pct,
    row?.discount_b2c,
    row?.b2c_discount,
    row?.discount_percentage,
    row?.discount_percent,
    row?.discount,
  );
};

const getB2BDiscount = (variant: AnyRecord, row: AnyRecord): number => {
  const variantDiscount = firstPositiveDiscount(
    variant?.b2b_discount_pct,
    variant?.discount_b2b,
    variant?.b2b_discount,
    variant?.discount_percentage_b2b,
  );

  if (variantDiscount > 0) return variantDiscount;

  return firstPositiveDiscount(
    row?.b2b_discount_pct,
    row?.discount_b2b,
    row?.b2b_discount,
    row?.discount_percentage_b2b,
  );
};

const normalizeVariant = (variant: AnyRecord, row: AnyRecord): AnyRecord => {
  const productId = firstValue(variant?.product_id, variant?.productId, row?.product_id, row?.productId);
  const variantId = getVariantId(variant, row);
  const size = getVariantSize(variant, row);
  const colour = getVariantColor(variant, row);
  const barcode = getVariantBarcode(variant, row);
  const b2cDiscount = getB2CDiscount(variant, row);
  const b2bDiscount = getB2BDiscount(variant, row);

  const mrp = toNumber(
    firstValue(
      variant?.original_price_b2c,
      variant?.originalPriceB2c,
      variant?.mrp,
      variant?.original_price,
      variant?.originalPrice,
      row?.original_price_b2c,
      row?.originalPriceB2c,
      row?.mrp,
      row?.original_price,
      row?.originalPrice,
      row?.price,
      0,
    ),
    0,
  );

  const directSalePrice = toNumber(
    firstValue(
      variant?.final_price_b2c,
      variant?.finalPriceB2c,
      variant?.sale_price,
      variant?.salePrice,
      variant?.price,
      variant?.selling_price,
      variant?.discounted_price,
      variant?.mahaveer_price,
      row?.final_price_b2c,
      row?.finalPriceB2c,
      row?.sale_price,
      row?.salePrice,
      row?.price,
      mrp,
    ),
    mrp,
  );

  const salePrice = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directSalePrice) : directSalePrice;

  const originalB2B = toNumber(
    firstValue(
      variant?.original_price_b2b,
      variant?.originalPriceB2b,
      variant?.cost_price,
      row?.original_price_b2b,
      row?.originalPriceB2b,
      row?.cost_price,
      mrp,
    ),
    mrp,
  );

  const finalB2B =
    b2bDiscount > 0 && originalB2B > 0
      ? calculateDiscountedPrice(originalB2B, b2bDiscount, originalB2B)
      : toNumber(firstValue(variant?.final_price_b2b, variant?.finalPriceB2b, row?.final_price_b2b, row?.finalPriceB2b, originalB2B), originalB2B);

  const images = getImagePairFromSource(variant);
  const imageUrl = images[0] || "";

  const onHand = toNumber(
    firstValue(
      variant?.available_qty,
      variant?.availableQty,
      variant?.on_hand,
      variant?.onHand,
      variant?.stock,
      variant?.qty,
      variant?.quantity,
      0,
    ),
    0,
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
    original_price_b2c: mrp,
    originalPriceB2c: mrp,
    final_price_b2c: salePrice,
    finalPriceB2c: salePrice,
    original_price_b2b: originalB2B,
    originalPriceB2b: originalB2B,
    final_price_b2b: finalB2B,
    finalPriceB2b: finalB2B,
    sale_price: salePrice,
    salePrice,
    price: salePrice,
    selling_price: salePrice,
    sellingPrice: salePrice,
    discounted_price: salePrice,
    discountedPrice: salePrice,
    mahaveer_price: salePrice,
    mahaveerPrice: salePrice,
    cost_price: originalB2B,
    costPrice: originalB2B,
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
    discountPercentage: b2cDiscount,
    discount_percent: b2cDiscount,
    discountPercent: b2cDiscount,
    on_hand: onHand,
    onHand,
    available_qty: onHand,
    availableQty: onHand,
    reserved: toNumber(variant?.reserved ?? 0, 0),
    in_stock: onHand > 0,
    inStock: onHand > 0,
    image_url: imageUrl,
    imageUrl,
    front_image_url: imageUrl,
    frontImageUrl: imageUrl,
    back_image_url: images[1] || "",
    backImageUrl: images[1] || "",
    main_image_url: imageUrl,
    mainImageUrl: imageUrl,
    images,
    raw: variant,
  };
};

const normalizeProduct = (row: AnyRecord): Product => {
  const productName = String(firstValue(row.product_name, row.productName, row.name, row.title, "Product")).trim();
  const brandName = String(firstValue(row.brand_name, row.brandName, row.brand, "Vandhana")).trim();
  const gender = toGender(firstValue(row.gender, row.category));
  const actualProductId = firstValue(row.product_id, row.productId, row.actual_product_id);
  const actualVariantId = firstValue(row.variant_id, row.variantId, row.primary_variant_id, row.primaryVariantId);
  const selectedColor = getVariantColor(row, row);
  const selectedSize = getVariantSize(row, row);
  const allRawVariants = getRawVariants(row);
  const normalizedVariants = allRawVariants.map((variant: AnyRecord) => normalizeVariant(variant, row));
  const availableVariants = normalizedVariants.filter((variant: AnyRecord) => toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0) > 0);
  const variants = availableVariants.length ? availableVariants : normalizedVariants;

  const selectedVariant =
    variants.find((variant: AnyRecord) => String(variant.variant_id || variant.variantId || variant.id).trim() === String(actualVariantId || "").trim()) ||
    variants.find((variant: AnyRecord) => normalizeText(variant.colour || variant.color) === normalizeText(selectedColor)) ||
    variants[0] ||
    {};

  const allColors = sortVariantValues(variants.map((variant: AnyRecord) => variant.colour || variant.color));
  const selectedColorVariants = variants.filter((variant: AnyRecord) => normalizeText(variant.colour || variant.color) === normalizeText(selectedColor));
  const selectedGroup = selectedColorVariants.length ? selectedColorVariants : variants;
  const colorSizes = sortVariantValues(selectedGroup.map((variant: AnyRecord) => variant.size));
  const allSizes = sortVariantValues(variants.map((variant: AnyRecord) => variant.size));

  const b2cDiscount = getB2CDiscount(selectedVariant, row);
  const mrp = toNumber(firstValue(selectedVariant?.original_price_b2c, selectedVariant?.mrp, row?.mrp, row?.original_price_b2c, row?.originalPrice, 0), 0);
  const directPrice = toNumber(firstValue(selectedVariant?.final_price_b2c, selectedVariant?.sale_price, selectedVariant?.price, row?.final_price_b2c, row?.price, mrp), mrp);
  const salePrice = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directPrice) : directPrice;
  const rowImages = getImagePairFromSource(row);
  const variantImages = getImagePairFromSource(selectedVariant);
  const images = uniqueImages([...variantImages, ...rowImages]);
  const imageUrl = images[0] || "/placeholder.svg";

  const totalStock = selectedGroup.reduce((sum: number, variant: AnyRecord) => {
    return sum + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0);
  }, 0);

  const stockBySize = selectedGroup.reduce((acc: Record<string, number>, variant: AnyRecord) => {
    const size = cleanSingleValue(variant.size);
    if (!size) return acc;
    acc[size] = (acc[size] || 0) + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0);
    return acc;
  }, {});

  return {
    id: String(firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, row?.id, selectedVariant?.barcode, actualProductId)),
    productId: actualProductId,
    product_id: actualProductId,
    variantId: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId),
    variant_id: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId),
    primaryVariantId: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId),
    primary_variant_id: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId),
    title: productName,
    product_name: productName,
    name: productName,
    description: String(firstValue(row.description, `${brandName} ${productName}`)).trim(),
    brand: brandName,
    brand_name: brandName,
    gender,
    category: gender,
    categoryId: String(firstValue(row.category_id, row.categoryId, findCategoryId(gender, productName))),
    category_id: String(firstValue(row.category_id, row.categoryId, findCategoryId(gender, productName))),
    price: salePrice,
    salePrice,
    sale_price: salePrice,
    selling_price: salePrice,
    final_price: salePrice,
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
    images,
    frontImageUrl: imageUrl,
    front_image_url: imageUrl,
    backImageUrl: images[1] || "",
    back_image_url: images[1] || "",
    mainImageUrl: imageUrl,
    main_image_url: imageUrl,
    imageUrl,
    image_url: imageUrl,
    barcode: firstValue(selectedVariant?.barcode, row?.barcode, row?.ean_code),
    ean_code: firstValue(selectedVariant?.ean_code, selectedVariant?.barcode, row?.ean_code, row?.barcode),
    size: selectedSize || colorSizes[0] || "",
    colour: selectedColor,
    color: selectedColor,
    selectedColor,
    selected_color: selectedColor,
    selectedColour: selectedColor,
    selected_colour: selectedColor,
    sizes: colorSizes,
    allSizes,
    all_sizes: allSizes,
    colors: allColors,
    colours: allColors,
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
    onHand: totalStock,
    on_hand: totalStock,
    available_qty: totalStock,
    patternCode: String(row.pattern_code || row.patternCode || "").trim(),
    pattern_code: String(row.pattern_code || row.patternCode || "").trim(),
    variants,
    colorVariants: selectedGroup,
    color_variants: selectedGroup,
    variantCount: variants.length,
    variant_count: variants.length,
    raw: row,
  } as any;
};

const readJson = async (res: Response): Promise<any> => {
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error((data as any)?.message || `Request failed with status ${res.status}`);
  }
  return data;
};

const extractRows = (data: any): AnyRecord[] => {
  if (Array.isArray(data)) return data as AnyRecord[];
  if (Array.isArray(data?.data)) return data.data as AnyRecord[];
  if (Array.isArray(data?.products)) return data.products as AnyRecord[];
  if (Array.isArray(data?.rows)) return data.rows as AnyRecord[];
  if (Array.isArray(data?.items)) return data.items as AnyRecord[];
  return [];
};

const fetchFromBranchApi = async (branchId: number): Promise<AnyRecord[]> => {
  const url = `${API_BASE}/api/branch/${encodeURIComponent(branchId)}/stock?_ts=${Date.now()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await readJson(res);
  return extractRows(data);
};

const fetchFromProductsApi = async (branchId: number): Promise<AnyRecord[]> => {
  const url = `${API_BASE}/api/products?branch_id=${encodeURIComponent(branchId)}&all=true&_ts=${Date.now()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await readJson(res);
  return extractRows(data);
};

export const fetchBranchProducts = async (branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  let rows: AnyRecord[] = [];

  try {
    rows = await fetchFromBranchApi(branchId);
  } catch {
    rows = await fetchFromProductsApi(branchId);
  }

  if (!Array.isArray(rows) || !rows.length) {
    try {
      rows = await fetchFromProductsApi(branchId);
    } catch {
      rows = [];
    }
  }

  const expandedRows = rows.flatMap((row: AnyRecord) => expandRowToColorCards(row));
  const colorRows = dedupeColorCards(expandedRows);

  return colorRows
    .map((row: AnyRecord) => normalizeProduct(row))
    .filter((product: any) => product.id || product.variantId || product.variant_id);
};

export const fetchProductsByGender = async (
  gender: ProductGender,
  branchId = DEFAULT_BRANCH_ID,
): Promise<Product[]> => {
  const products = await fetchBranchProducts(branchId);
  return products.filter((product: Product) => normalizeText(product.gender) === normalizeText(gender));
};

export const fetchProductById = async (
  id: string | number,
  branchId = DEFAULT_BRANCH_ID,
): Promise<Product | null> => {
  const products = await fetchBranchProducts(branchId);
  const target = String(id || "").trim();

  const directCardMatch =
    products.find((product: any) => String(product.id || "").trim() === target) ||
    products.find((product: any) => String(product.variantId || "").trim() === target) ||
    products.find((product: any) => String(product.variant_id || "").trim() === target) ||
    products.find((product: any) => String(product.primaryVariantId || "").trim() === target) ||
    products.find((product: any) => String(product.primary_variant_id || "").trim() === target) ||
    products.find((product: any) => String(product.barcode || "").trim() === target) ||
    products.find((product: any) => String(product.ean_code || "").trim() === target) ||
    null;

  if (directCardMatch) return directCardMatch;

  const variantMatch = products.find(
    (product: any) =>
      Array.isArray(product.variants) &&
      product.variants.some(
        (variant: any) =>
          String(variant.variant_id || "").trim() === target ||
          String(variant.variantId || "").trim() === target ||
          String(variant.id || "").trim() === target ||
          String(variant.barcode || "").trim() === target ||
          String(variant.ean_code || "").trim() === target,
      ),
  );

  if (variantMatch) return variantMatch;

  const productMatch =
    products.find((product: any) => String(product.productId || "").trim() === target) ||
    products.find((product: any) => String(product.product_id || "").trim() === target) ||
    null;

  return productMatch;
};