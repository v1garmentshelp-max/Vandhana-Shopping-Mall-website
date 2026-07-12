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

const roundMoney = (value: number) => {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
};

const clampDiscount = (value: any) => {
  const n = toNumber(value, 0);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const calculateDiscountedPrice = (original: any, discount: any, fallback = 0) => {
  const base = toNumber(original, fallback);
  const pct = clampDiscount(discount);
  if (!base) return toNumber(fallback, 0);
  if (!pct) return base;
  return roundMoney(base - (base * pct) / 100);
};

const firstValue = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const firstPositiveDiscount = (...values: any[]) => {
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

const isGroupedValue = (value: any) => {
  const s = String(value || "").trim();
  if (!s) return false;
  if (s.includes(",")) return true;
  if (s.split(/\s+/).length > 4) return true;
  return false;
};

const cleanSingleValue = (value: any) => {
  const s = String(value || "").trim();
  if (!s) return "";
  if (isGroupedValue(s)) return "";
  return s;
};

const normalizeColorDisplay = (value: any) => {
  const raw = cleanSingleValue(value);
  if (!raw) return "";

  const fixes: Record<string, string> = {
    "dark bblue": "DARK BLUE",
    "darkblue": "DARK BLUE",
    "dark blu": "DARK BLUE",
    "dark bluee": "DARK BLUE",
    "sea blu": "SEA BLUE",
    "seablue": "SEA BLUE",
    "see blue": "SEA BLUE",
    "iceblue": "ICE BLUE",
    "ice blu": "ICE BLUE",
    "offwhite": "OFF WHITE",
    "off white": "OFF WHITE",
  };

  const key = normalizeText(raw);
  return fixes[key] || raw;
};

const getVariantIdValue = (variant: any, row: any = {}) =>
  firstValue(
    variant?.variant_id,
    variant?.variantId,
    variant?.id,
    row?.variant_id,
    row?.variantId,
    row?.primary_variant_id,
    row?.primaryVariantId,
  );

const getVariantBarcodeValue = (variant: any, row: any = {}) =>
  String(firstValue(variant?.barcode, variant?.ean_code, variant?.eanCode, row?.barcode, row?.ean_code, row?.eanCode)).trim();

const getVariantColorValue = (variant: any, row: any = {}) =>
  normalizeColorDisplay(
    firstValue(
      variant?.colour,
      variant?.color,
      variant?.selected_colour,
      variant?.selectedColor,
      variant?.selected_color,
      row?.colour,
      row?.color,
      row?.selected_colour,
      row?.selectedColor,
      row?.selected_color,
      row?.display_color,
      row?.displayColor,
    ),
  );

const getVariantSizeValue = (variant: any, row: any = {}) =>
  cleanSingleValue(firstValue(variant?.size, variant?.selected_size, variant?.selectedSize, row?.size, row?.selected_size, row?.selectedSize));

const isBadImage = (value: any) => {
  const s = String(value || "").trim().toLowerCase();
  return !s || s === "[object object]" || s.includes("undefined") || s.includes("null") || s.includes("placeholder.svg");
};

const imageUrlFromRecord = (image: any) => {
  if (!image) return "";
  if (typeof image === "string") return image.trim();
  return String(image.image_url || image.imageUrl || image.secure_url || image.url || "").trim();
};

const uniqueStrings = (items: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item) => {
    const value = cleanSingleValue(item);
    if (!value || value === "[object Object]") return;

    const key = value.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    out.push(value);
  });

  return out;
};

const uniqueImages = (items: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item) => {
    const value = imageUrlFromRecord(item);
    if (isBadImage(value)) return;

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
        if (typeof item === "string") return { image_url: item } as ProductImage;
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
            if (typeof item === "string") return { image_url: item } as ProductImage;
            return item;
          })
          .filter(Boolean);
      }
    } catch {
      if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
        return [{ image_url: value } as ProductImage];
      }
    }
  }

  return [];
};

const imageByType = (images: any[], ...types: string[]) => {
  const keys = types.map(normalizeText).filter(Boolean);
  const found = images.find((img) => {
    const imageType = normalizeText(img?.image_type || img?.type || img?.label || img?.name || img?.view || img?.position);
    return keys.some((key) => imageType.includes(key));
  });
  return imageUrlFromRecord(found);
};

const firstDifferentImage = (images: any[], front: string) => {
  const frontKey = String(front || "").trim().toLowerCase();
  return imageUrlFromRecord(
    images.find((image) => {
      const value = imageUrlFromRecord(image);
      return value && value.toLowerCase() !== frontKey;
    }),
  );
};

const getImagePairFromSource = (source: any) => {
  const rawImages = parseImages(source?.images);

  const front = firstValue(
    source?.front_image_url,
    source?.frontImageUrl,
    source?.front_url,
    source?.frontUrl,
    source?.front_image,
    source?.frontImage,
    imageByType(rawImages, "front", "primary"),
    source?.image_url,
    source?.imageUrl,
    source?.main_image_url,
    source?.mainImageUrl,
    imageByType(rawImages, "main", "default"),
    rawImages[0],
  );

  const back = firstValue(
    source?.back_image_url,
    source?.backImageUrl,
    source?.back_url,
    source?.backUrl,
    source?.back_image,
    source?.backImage,
    source?.rear_image_url,
    source?.rearImageUrl,
    source?.secondary_image_url,
    source?.secondaryImageUrl,
    source?.hover_image_url,
    source?.hoverImageUrl,
    source?.image2,
    source?.image_2,
    source?.second_image_url,
    source?.secondImageUrl,
    imageByType(rawImages, "back", "rear", "secondary", "hover", "second", "alternate"),
    rawImages[1],
    firstDifferentImage(rawImages, imageUrlFromRecord(front)),
  );

  return uniqueImages([front, back]).slice(0, 2);
};

const getGenderCategoryId = (gender: ProductGender) => {
  return categories.find((c) => c.level === 0 && normalizeText(c.name) === normalizeText(gender))?.id || "";
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
    { keys: ["kurti"], targets: ["kurti pant sets", "kurti pant set", "co ord sets", "co-ord sets"] },
    { keys: ["beggi", "baggy", "bagge"], targets: ["beggi", "pants"] },
    { keys: ["cargo"], targets: ["cargo pants", "pants"] },
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
    { keys: ["frock"], targets: ["frocks", "dresses"] },
    { keys: ["night dress"], targets: ["night dresses", "night dress", "nightwear", "sleepwear"] },
    { keys: ["hoodie"], targets: ["hoodies"] },
    { keys: ["sweatshirt"], targets: ["sweatshirts"] },
  ];

  for (const alias of aliases) {
    if (alias.keys.some((key) => name.includes(normalizeText(key)))) {
      for (const target of alias.targets) {
        const exact = leafCategories.find((c) => normalizeText(c.name) === normalizeText(target));

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
  if (Array.isArray(row?.color_variants) && row.color_variants.length) return row.color_variants;
  if (Array.isArray(row?.colorVariants) && row.colorVariants.length) return row.colorVariants;
  return [row];
};

const getDetailVariants = (row: any) => {
  if (Array.isArray(row?.variants) && row.variants.length) return row.variants;
  if (Array.isArray(row?.color_variants) && row.color_variants.length) return row.color_variants;
  if (Array.isArray(row?.colorVariants) && row.colorVariants.length) return row.colorVariants;
  return [row];
};

const getListingCardKey = (row: any) => {
  const barcode = String(firstValue(row?.barcode, row?.ean_code, row?.eanCode)).trim();
  if (barcode) return `barcode:${barcode.toLowerCase()}`;

  const variantId = String(firstValue(row?.variant_id, row?.variantId, row?.primary_variant_id, row?.primaryVariantId)).trim();
  if (variantId) return `variant:${variantId}`;

  const cardKey = String(firstValue(row?.card_key, row?.cardKey, row?.listing_id, row?.listingId)).trim();
  if (cardKey) return `card:${cardKey.toLowerCase()}`;

  const id = String(row?.id || "").trim();
  const productId = String(firstValue(row?.product_id, row?.productId, row?.actual_product_id)).trim();
  const brand = normalizeText(row?.brand_name || row?.brand || "");
  const name = normalizeText(row?.product_name || row?.name || row?.title || "");
  const color = normalizeText(getVariantColorValue(row, row));
  const size = normalizeText(getVariantSizeValue(row, row));
  const image = normalizeText(imageUrlFromRecord(row?.front_image_url || row?.frontImageUrl || row?.image_url || row?.imageUrl));

  if (id && id !== productId) return `id:${id}`;
  return `details:${productId}|${brand}|${name}|${color}|${size}|${image}`;
};

const getVariantMergeKey = (variant: any, row: any) => {
  const barcode = getVariantBarcodeValue(variant, row);
  if (barcode) return `barcode:${barcode.toLowerCase()}`;

  const id = String(getVariantIdValue(variant, row) || "").trim();
  if (id) return `variant:${id}`;

  const size = normalizeText(getVariantSizeValue(variant, row));
  const colour = normalizeText(getVariantColorValue(variant, row));

  return `combo:${size}|${colour}`;
};

const mergeRawRows = (rows: any[]) => {
  const groups = new Map<string, any>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const key = getListingCardKey(row);

    if (!groups.has(key)) {
      groups.set(key, {
        ...row,
        colour: getVariantColorValue(row, row) || row?.colour || row?.color || "",
        color: getVariantColorValue(row, row) || row?.color || row?.colour || "",
        variants: [],
        _variantMap: new Map<string, any>(),
      });
    }

    const group = groups.get(key);

    for (const variant of getDetailVariants(row)) {
      const size = getVariantSizeValue(variant, row);
      const colour = getVariantColorValue(variant, row);

      if (!size && !colour && isGroupedValue(variant?.size || row?.size || variant?.colour || row?.colour || "")) continue;

      const variantKey = getVariantMergeKey(variant, row);

      const mergedVariant = {
        ...row,
        ...variant,
        product_id: firstValue(variant?.product_id, variant?.productId, row?.product_id, row?.productId, row?.id),
        productId: firstValue(variant?.productId, variant?.product_id, row?.productId, row?.product_id, row?.id),
        variant_id: firstValue(variant?.variant_id, variant?.variantId, variant?.id, row?.variant_id, row?.variantId),
        variantId: firstValue(variant?.variantId, variant?.variant_id, variant?.id, row?.variantId, row?.variant_id),
        barcode: getVariantBarcodeValue(variant, row),
        ean_code: getVariantBarcodeValue(variant, row),
        eanCode: getVariantBarcodeValue(variant, row),
        size,
        colour,
        color: colour,
        image_url: firstValue(variant?.image_url, variant?.imageUrl, ""),
        imageUrl: firstValue(variant?.imageUrl, variant?.image_url, ""),
        front_image_url: firstValue(variant?.front_image_url, variant?.frontImageUrl, ""),
        frontImageUrl: firstValue(variant?.frontImageUrl, variant?.front_image_url, ""),
        back_image_url: firstValue(variant?.back_image_url, variant?.backImageUrl, ""),
        backImageUrl: firstValue(variant?.backImageUrl, variant?.back_image_url, ""),
        main_image_url: firstValue(variant?.main_image_url, variant?.mainImageUrl, ""),
        mainImageUrl: firstValue(variant?.mainImageUrl, variant?.main_image_url, ""),
        images: variant?.images || [],
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
      color_variants: Array.isArray(group.color_variants) && group.color_variants.length ? group.color_variants : variants,
      colorVariants: Array.isArray(group.colorVariants) && group.colorVariants.length ? group.colorVariants : variants,
      variant_count: variants.length,
      variantCount: variants.length,
      card_key: getListingCardKey(group),
      cardKey: getListingCardKey(group),
    };
  });
};

const getB2CDiscount = (variant: any, row: any) => {
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

const getB2BDiscount = (variant: any, row: any) => {
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

const getOriginalB2C = (variant: any, row: any) => {
  return toNumber(
    firstValue(
      variant?.original_price_b2c,
      variant?.originalPriceB2c,
      variant?.b2c_original_price,
      variant?.mrp,
      variant?.original_price,
      variant?.originalPrice,
      row?.original_price_b2c,
      row?.originalPriceB2c,
      row?.b2c_original_price,
      row?.mrp,
      row?.original_price,
      row?.originalPrice,
      row?.price,
      row?.salePrice,
      0,
    ),
    0,
  );
};

const getOriginalB2B = (variant: any, row: any, fallback: number) => {
  return toNumber(
    firstValue(
      variant?.original_price_b2b,
      variant?.originalPriceB2b,
      variant?.b2b_original_price,
      variant?.cost_price,
      row?.original_price_b2b,
      row?.originalPriceB2b,
      row?.b2b_original_price,
      row?.cost_price,
      fallback,
    ),
    fallback,
  );
};

const getDirectB2CPrice = (variant: any, row: any, fallback: number) => {
  return toNumber(
    firstValue(
      variant?.final_price_b2c,
      variant?.finalPriceB2c,
      variant?.b2c_final_price,
      variant?.sale_price,
      variant?.salePrice,
      variant?.price,
      variant?.selling_price,
      variant?.discounted_price,
      variant?.mahaveer_price,
      row?.final_price_b2c,
      row?.finalPriceB2c,
      row?.b2c_final_price,
      row?.sale_price,
      row?.salePrice,
      row?.price,
      row?.selling_price,
      row?.discounted_price,
      row?.mahaveer_price,
      fallback,
    ),
    fallback,
  );
};

const isSameVariantAsRow = (variant: any, row: any) => {
  const variantIds = [variant?.variant_id, variant?.variantId, variant?.id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const rowVariantIds = [row?.variant_id, row?.variantId, row?.primary_variant_id, row?.primaryVariantId]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (variantIds.length && rowVariantIds.length && variantIds.some((id) => rowVariantIds.includes(id))) return true;

  const variantBarcodes = [variant?.barcode, variant?.ean_code, variant?.eanCode]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const rowBarcodes = [row?.barcode, row?.ean_code, row?.eanCode]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (variantBarcodes.length && rowBarcodes.length && variantBarcodes.some((code) => rowBarcodes.includes(code))) return true;

  return !Array.isArray(row?.variants) || row.variants.length <= 1;
};

const getImagesFromVariantOnly = (variant: any) => getImagePairFromSource(variant);

const getImagesFromRowOnly = (row: any) => getImagePairFromSource(row);

const normalizeVariant = (variant: any, row: any) => {
  const productId = firstValue(variant?.product_id, variant?.productId, row?.product_id, row?.productId, row?.id, null);
  const variantId = getVariantIdValue(variant, row) || null;
  const size = getVariantSizeValue(variant, row);
  const colour = getVariantColorValue(variant, row);
  const barcode = getVariantBarcodeValue(variant, row);
  const b2cDiscount = getB2CDiscount(variant, row);
  const b2bDiscount = getB2BDiscount(variant, row);
  const mrp = getOriginalB2C(variant, row);
  const directSalePrice = getDirectB2CPrice(variant, row, mrp);
  const salePrice = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directSalePrice) : directSalePrice;
  const originalB2B = getOriginalB2B(variant, row, mrp);
  const finalB2B = b2bDiscount > 0 && originalB2B > 0
    ? calculateDiscountedPrice(originalB2B, b2bDiscount, originalB2B)
    : toNumber(firstValue(variant?.final_price_b2b, variant?.finalPriceB2b, variant?.b2b_final_price, row?.final_price_b2b, row?.finalPriceB2b, row?.b2b_final_price, originalB2B), originalB2B);

  const variantImages = getImagesFromVariantOnly(variant);
  const rowImages = isSameVariantAsRow(variant, row) ? getImagesFromRowOnly(row) : [];
  const images = uniqueImages([...variantImages, ...rowImages]).slice(0, 2);
  const imageUrl = images[0] || "";

  const onHand = toNumber(
    firstValue(
      variant?.on_hand,
      variant?.onHand,
      variant?.stock,
      variant?.qty,
      variant?.quantity,
      row?.on_hand,
      row?.onHand,
      row?.stock,
      0,
    ),
    0,
  );

  const availableQty = toNumber(
    firstValue(
      variant?.available_qty,
      variant?.availableQty,
      onHand,
    ),
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
    original_price_b2c: mrp,
    originalPriceB2c: mrp,
    final_price_b2c: salePrice,
    finalPriceB2c: salePrice,
    original_price_b2b: originalB2B,
    originalPriceB2b: originalB2B,
    final_price_b2b: finalB2B,
    finalPriceB2b: finalB2B,
    sale_price: salePrice,
    salePrice: salePrice,
    price: salePrice,
    selling_price: salePrice,
    sellingPrice: salePrice,
    discounted_price: salePrice,
    discountedPrice: salePrice,
    mahaveer_price: salePrice,
    mahaveerPrice: salePrice,
    base_sale_price: directSalePrice,
    original_sale_price: directSalePrice,
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
    reserved: toNumber(variant?.reserved ?? 0, 0),
    available_qty: availableQty,
    availableQty,
    in_stock: variant?.in_stock === undefined ? availableQty > 0 : Boolean(variant?.in_stock),
    inStock: variant?.inStock === undefined ? availableQty > 0 : Boolean(variant?.inStock),
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

const getVariantImagesForDisplay = (variant: any, row: any) => {
  const variantImages = getImagesFromVariantOnly(variant);
  const rowImages = isSameVariantAsRow(variant, row) ? getImagesFromRowOnly(row) : [];
  const images = uniqueImages([...variantImages, ...rowImages]).slice(0, 2);
  return images.length ? images : ["/placeholder.svg"];
};

const getProductScore = (product: any) => {
  const imageScore = imageUrlFromRecord(product?.frontImageUrl || product?.front_image_url || product?.imageUrl || product?.image_url) ? 1000000 : 0;
  const stockScore = toNumber(firstValue(product?.available_qty, product?.onHand, product?.on_hand, 0), 0) > 0 ? 100000 : 0;
  const variantScore = toNumber(firstValue(product?.variantId, product?.variant_id, product?.id, 0), 0);
  return imageScore + stockScore + variantScore;
};

const mergeVariantArrays = (...lists: any[][]) => {
  const map = new Map<string, any>();

  const allItems = ([] as any[]).concat(...lists);

  allItems.forEach((variant) => {
    const key = getVariantMergeKey(variant, variant);
    if (!map.has(key)) {
      map.set(key, variant);
      return;
    }
    map.set(key, { ...map.get(key), ...variant });
  });

  return Array.from(map.values());
};

const shouldUseColorAliasDedupe = (product: any) => {
  const title = normalizeText(product?.title || product?.product_name || product?.name);
  return title.includes("night dress");
};

const getProductIdentityKey = (product: any) => {
  const barcode = String(firstValue(product?.barcode, product?.ean_code, product?.eanCode)).trim();
  if (barcode) return `barcode:${barcode.toLowerCase()}`;

  const variantId = String(firstValue(product?.variantId, product?.variant_id, product?.primaryVariantId, product?.primary_variant_id)).trim();
  if (variantId) return `variant:${variantId}`;

  const id = String(product?.id || "").trim();
  if (id) return `id:${id}`;

  return [
    "details",
    normalizeText(product?.gender || product?.category),
    normalizeText(product?.brand || product?.brand_name),
    normalizeText(product?.title || product?.product_name || product?.name),
    normalizeText(product?.colour || product?.color),
    normalizeText(product?.size),
    normalizeText(product?.imageUrl || product?.image_url || product?.frontImageUrl || product?.front_image_url),
  ].join("|");
};

const getProductColorAliasKey = (product: any) => {
  return [
    normalizeText(product?.gender || product?.category),
    normalizeText(product?.brand || product?.brand_name),
    normalizeText(product?.title || product?.product_name || product?.name),
    normalizeText(product?.patternCode || product?.pattern_code),
    normalizeText(product?.colour || product?.color),
  ].join("|");
};

const mergeDuplicateProducts = (a: any, b: any) => {
  const best = getProductScore(b) >= getProductScore(a) ? b : a;
  const other = best === b ? a : b;
  const variants = mergeVariantArrays(Array.isArray(best?.variants) ? best.variants : [], Array.isArray(other?.variants) ? other.variants : []);
  const colorVariants = mergeVariantArrays(Array.isArray(best?.colorVariants) ? best.colorVariants : [], Array.isArray(other?.colorVariants) ? other.colorVariants : []);
  const sizes = sortVariantValues([...(best?.sizes || []), ...(other?.sizes || [])]);
  const colors = sortVariantValues([...(best?.colors || []), ...(other?.colors || []), best?.colour, other?.colour, best?.color, other?.color]);

  return {
    ...best,
    variants,
    colorVariants: colorVariants.length ? colorVariants : variants,
    color_variants: colorVariants.length ? colorVariants : variants,
    variantCount: variants.length,
    variant_count: variants.length,
    colorVariantCount: colorVariants.length || variants.length,
    color_variant_count: colorVariants.length || variants.length,
    sizes,
    allSizes: sizes,
    all_sizes: sizes,
    colors,
    colours: colors,
  };
};

const dedupeProducts = (products: Product[]) => {
  const exactMap = new Map<string, any>();

  products.forEach((product: any) => {
    const key = getProductIdentityKey(product);

    if (!exactMap.has(key)) {
      exactMap.set(key, product);
      return;
    }

    exactMap.set(key, mergeDuplicateProducts(exactMap.get(key), product));
  });

  const out: any[] = [];
  const colorMap = new Map<string, number>();

  Array.from(exactMap.values()).forEach((product: any) => {
    if (!shouldUseColorAliasDedupe(product)) {
      out.push(product);
      return;
    }

    const key = getProductColorAliasKey(product);

    if (!colorMap.has(key)) {
      colorMap.set(key, out.length);
      out.push(product);
      return;
    }

    const index = colorMap.get(key)!;
    out[index] = mergeDuplicateProducts(out[index], product);
  });

  return out as Product[];
};

const applySelectedVariantToProduct = (product: any, target: string) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!target || !variants.length) return product;

  const selectedVariant =
    variants.find((variant: any) => String(variant.variant_id || "").trim() === target) ||
    variants.find((variant: any) => String(variant.variantId || "").trim() === target) ||
    variants.find((variant: any) => String(variant.id || "").trim() === target) ||
    variants.find((variant: any) => String(variant.barcode || "").trim() === target) ||
    variants.find((variant: any) => String(variant.ean_code || "").trim() === target) ||
    null;

  if (!selectedVariant) return product;

  const selectedImages = getVariantImagesForDisplay(selectedVariant, product);
  const mrp = toNumber(selectedVariant.original_price_b2c ?? selectedVariant.mrp ?? product.originalPrice ?? product.mrp, product.originalPrice || 0);
  const price = toNumber(selectedVariant.final_price_b2c ?? selectedVariant.sale_price ?? selectedVariant.price ?? product.price, product.price || 0);
  const discount = getB2CDiscount(selectedVariant, product);
  const nextVariants = [
    selectedVariant,
    ...variants.filter((variant: any) => variant !== selectedVariant),
  ];

  return {
    ...product,
    id: String(selectedVariant.variant_id || selectedVariant.variantId || selectedVariant.id || selectedVariant.barcode || product.id),
    variantId: selectedVariant.variant_id || selectedVariant.variantId || selectedVariant.id || product.variantId,
    variant_id: selectedVariant.variant_id || selectedVariant.variantId || selectedVariant.id || product.variant_id,
    primaryVariantId: selectedVariant.variant_id || selectedVariant.variantId || selectedVariant.id || product.primaryVariantId,
    primary_variant_id: selectedVariant.variant_id || selectedVariant.variantId || selectedVariant.id || product.primary_variant_id,
    price,
    salePrice: price,
    sale_price: price,
    selling_price: price,
    final_price: price,
    final_price_b2c: price,
    discounted_price: price,
    mahaveer_price: price,
    originalPrice: mrp,
    original_price_b2c: mrp,
    mrp,
    isSale: mrp > price,
    discount,
    discount_b2c: discount,
    discount_percentage: discount,
    discount_percent: discount,
    b2c_discount_pct: discount,
    images: selectedImages,
    imageUrl: selectedImages[0] || "/placeholder.svg",
    image_url: selectedImages[0] || "/placeholder.svg",
    frontImageUrl: selectedImages[0] || "",
    front_image_url: selectedImages[0] || "",
    backImageUrl: selectedImages[1] || "",
    back_image_url: selectedImages[1] || "",
    mainImageUrl: selectedImages[0] || "",
    main_image_url: selectedImages[0] || "",
    barcode: selectedVariant.barcode || product.barcode,
    ean_code: selectedVariant.ean_code || selectedVariant.barcode || product.ean_code,
    size: selectedVariant.size || product.size,
    colour: selectedVariant.colour || product.colour,
    color: selectedVariant.color || product.color,
    variants: nextVariants,
  };
};

const normalizeProduct = (row: any): Product => {
  const productName = String(row.product_name || row.productName || row.name || row.title || "Product").trim();
  const brandName = String(row.brand_name || row.brandName || row.brand || "Vandhana").trim();
  const gender = toGender(row.gender || row.category);

  const actualProductId = firstValue(row.product_id, row.productId, row.actual_product_id, row.parent_product_id, null);
  const actualVariantId = firstValue(row.variant_id, row.variantId, row.primary_variant_id, row.primaryVariantId, null);
  const barcode = String(firstValue(row.barcode, row.ean_code, row.eanCode)).trim();

  const rawVariants = getDetailVariants(row);
  const allVariants = rawVariants
    .map((variant: any) => normalizeVariant(variant, row))
    .filter((variant: any) => cleanSingleValue(variant.size) || cleanSingleValue(variant.colour || variant.color) || variant.variant_id || variant.id || variant.barcode);

  const availableVariants = allVariants.filter((variant: any) => toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0) > 0);
  const variants = availableVariants.length ? availableVariants : allVariants;

  const selectedVariant =
    variants.find((variant: any) => String(variant.variant_id || "") === String(actualVariantId || "")) ||
    variants.find((variant: any) => String(variant.variantId || "") === String(actualVariantId || "")) ||
    variants.find((variant: any) => String(variant.barcode || "") === String(barcode || "")) ||
    variants[0] ||
    {};

  const selectedColor = getVariantColorValue(selectedVariant, row) || getVariantColorValue(row, row);
  const selectedSize = getVariantSizeValue(selectedVariant, row) || getVariantSizeValue(row, row);
  const sizeList = sortVariantValues(variants.map((variant: any) => variant.size));
  const colorList = sortVariantValues(variants.map((variant: any) => variant.colour || variant.color));

  const onHand = variants.reduce((sum: number, variant: any) => sum + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0), 0);

  const mrp = toNumber(
    firstValue(
      selectedVariant?.original_price_b2c,
      selectedVariant?.originalPriceB2c,
      selectedVariant?.mrp,
      row.mrp,
      row.original_price_b2c,
      row.originalPriceB2c,
      row.originalPrice,
      row.original_price,
      row.price,
      0,
    ),
    0,
  );

  const b2cDiscount = getB2CDiscount(selectedVariant, row);
  const directSalePrice = getDirectB2CPrice(selectedVariant, row, mrp);
  const salePrice = b2cDiscount > 0 && mrp > 0 ? calculateDiscountedPrice(mrp, b2cDiscount, directSalePrice) : directSalePrice;
  const images = getVariantImagesForDisplay(selectedVariant, row);
  const imageUrl = images[0] || "/placeholder.svg";
  const cardId = String(firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, selectedVariant?.barcode, barcode, row?.id, actualProductId, ""));

  const colorVariants = variants.filter((variant: any) => normalizeText(variant.colour || variant.color) === normalizeText(selectedColor));
  const selectedGroup = colorVariants.length ? colorVariants : variants;

  const stockBySize = selectedGroup.reduce((acc: Record<string, number>, variant: any) => {
    const size = cleanSingleValue(variant.size || "");
    if (!size) return acc;
    acc[size] = (acc[size] || 0) + toNumber(variant.available_qty ?? variant.on_hand ?? 0, 0);
    return acc;
  }, {});

  const normalized: any = {
    id: cardId,
    productId: actualProductId || selectedVariant?.product_id || selectedVariant?.productId || undefined,
    product_id: actualProductId || selectedVariant?.product_id || selectedVariant?.productId || undefined,
    variantId: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, undefined),
    variant_id: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, undefined),
    primaryVariantId: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, undefined),
    primary_variant_id: firstValue(selectedVariant?.variant_id, selectedVariant?.variantId, actualVariantId, undefined),
    title: productName,
    product_name: productName,
    name: productName,
    description: String(row.description || `${brandName} ${productName}`).trim(),
    brand: brandName,
    brand_name: brandName,
    gender,
    category: gender,
    categoryId: String(row.category_id || row.categoryId || findCategoryId(gender, productName)),
    category_id: String(row.category_id || row.categoryId || findCategoryId(gender, productName)),
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
    barcode: firstValue(selectedVariant?.barcode, barcode),
    ean_code: firstValue(selectedVariant?.ean_code, selectedVariant?.barcode, barcode),
    eanCode: firstValue(selectedVariant?.eanCode, selectedVariant?.ean_code, selectedVariant?.barcode, barcode),
    size: selectedSize || sizeList[0] || "",
    colour: selectedColor || colorList[0] || "",
    color: selectedColor || colorList[0] || "",
    selectedColor: selectedColor || colorList[0] || "",
    selected_color: selectedColor || colorList[0] || "",
    selectedColour: selectedColor || colorList[0] || "",
    selected_colour: selectedColor || colorList[0] || "",
    sizes: sortVariantValues(selectedGroup.map((variant: any) => variant.size)),
    allSizes: sizeList,
    all_sizes: sizeList,
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
    on_hand: onHand,
    available_qty: onHand,
    availableQty: onHand,
    patternCode: String(row.pattern_code || row.patternCode || "").trim(),
    pattern_code: String(row.pattern_code || row.patternCode || "").trim(),
    variants,
    colorVariants: selectedGroup,
    color_variants: selectedGroup,
    variantCount: variants.length,
    variant_count: variants.length,
    colorVariantCount: selectedGroup.length,
    color_variant_count: selectedGroup.length,
    raw: row,
  };

  return normalized as Product;
};

const readJson = async (res: Response) => {
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error((data as any)?.message || `Request failed with status ${res.status}`);
  }
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

const fetchFromProductsApi = async (branchId: number) => {
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

const fetchFromBranchApi = async (branchId: number) => {
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

export const fetchBranchProducts = async (branchId = DEFAULT_BRANCH_ID): Promise<Product[]> => {
  let rows: any[] = [];

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

  const groupedRows = mergeRawRows(Array.isArray(rows) ? rows : []);
  const products = groupedRows.map(normalizeProduct).filter((product) => product.id);
  return dedupeProducts(products);
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

  const variantMatch = products.find((product: any) =>
    Array.isArray(product.variants) &&
    product.variants.some(
      (variant: any) =>
        String(variant.variant_id || "").trim() === target ||
        String(variant.variantId || "").trim() === target ||
        String(variant.id || "").trim() === target ||
        String(variant.barcode || "").trim() === target ||
        String(variant.ean_code || "").trim() === target ||
        String(variant.eanCode || "").trim() === target,
    ),
  );

  if (variantMatch) return applySelectedVariantToProduct(variantMatch, target) as Product;

  const productMatch =
    products.find((product: any) => String(product.id || "").trim() === target) ||
    products.find((product: any) => String(product.variantId || "").trim() === target) ||
    products.find((product: any) => String(product.variant_id || "").trim() === target) ||
    products.find((product: any) => String(product.primaryVariantId || "").trim() === target) ||
    products.find((product: any) => String(product.primary_variant_id || "").trim() === target) ||
    products.find((product: any) => String(product.barcode || "").trim() === target) ||
    products.find((product: any) => String(product.ean_code || "").trim() === target) ||
    products.find((product: any) => String(product.productId || "").trim() === target) ||
    products.find((product: any) => String(product.product_id || "").trim() === target) ||
    null;

  return productMatch;
};