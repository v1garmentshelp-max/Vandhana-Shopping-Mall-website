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
  children?: StorefrontCategory[];
};

const fallbackCategories = categoriesJson as StorefrontCategory[];

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
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

const firstValue = (...values: any[]) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const calculateDiscountedPrice = (
  original: any,
  discount: any,
  fallback = 0,
) => {
  const base = toNumber(original, fallback);
  const pct = clampDiscount(discount);

  if (!base) return toNumber(fallback, 0);
  if (!pct) return base;

  return roundMoney(base - (base * pct) / 100);
};

const toGender = (value: any): ProductGender => {
  const s = normalizeText(value);

  if (s.includes("women")) return "Women";

  if (
    s.includes("kid") ||
    s.includes("boy") ||
    s.includes("girl")
  ) {
    return "Kids";
  }

  return "Men";
};

const toBackendGender = (
  gender: ProductGender | string,
) => {
  const s = normalizeText(gender);

  if (s === "women") return "WOMEN";

  if (
    s === "kids" ||
    s === "kid"
  ) {
    return "KIDS";
  }

  return "MEN";
};

const cleanSingleValue = (value: any) => {
  const s = String(value || "").trim();

  if (!s) return "";
  if (s.includes(",")) return "";
  if (s.split(/\s+/).length > 6) return "";

  return s;
};

const normalizeColorDisplay = (value: any) => {
  const raw = cleanSingleValue(value);

  if (!raw) return "";

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
    offwhite: "OFF WHITE",
    "off white": "OFF WHITE",
  };

  const key = normalizeText(raw);

  return fixes[key] || raw;
};

const imageUrlFromRecord = (image: any) => {
  if (!image) return "";

  if (typeof image === "string") {
    return image.trim();
  }

  return String(
    image.image_url ||
      image.imageUrl ||
      image.secure_url ||
      image.url ||
      "",
  ).trim();
};

const isBadImage = (value: any) => {
  const s = String(value || "")
    .trim()
    .toLowerCase();

  return (
    !s ||
    s === "[object object]" ||
    s.includes("undefined") ||
    s.includes("null") ||
    s.includes("placeholder.svg")
  );
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

const uniqueStrings = (items: any[]) => {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item) => {
    const value = cleanSingleValue(item);

    if (
      !value ||
      value === "[object Object]"
    ) {
      return;
    }

    const key = value.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    out.push(value);
  });

  return out;
};

const sortVariantValues = (items: any[]) => {
  return uniqueStrings(items).sort((a, b) => {
    const na = parseFloat(
      String(a).replace(/[^\d.]/g, ""),
    );

    const nb = parseFloat(
      String(b).replace(/[^\d.]/g, ""),
    );

    if (
      Number.isFinite(na) &&
      Number.isFinite(nb) &&
      na !== nb
    ) {
      return na - nb;
    }

    return String(a).localeCompare(
      String(b),
      undefined,
      { numeric: true },
    );
  });
};

const parseImages = (
  value: any,
): ProductImage[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return {
            image_url: item,
          } as ProductImage;
        }

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
            if (typeof item === "string") {
              return {
                image_url: item,
              } as ProductImage;
            }

            return item;
          })
          .filter(Boolean);
      }
    } catch {
      if (
        /^https?:\/\//i.test(value) ||
        value.startsWith("/")
      ) {
        return [
          {
            image_url: value,
          } as ProductImage,
        ];
      }
    }
  }

  return [];
};

const imageByType = (
  images: any[],
  ...types: string[]
) => {
  const keys = types
    .map(normalizeText)
    .filter(Boolean);

  const found = images.find((img) => {
    const imageType = normalizeText(
      img?.image_type ||
        img?.type ||
        img?.label ||
        img?.name ||
        img?.view ||
        img?.position,
    );

    return keys.some((key) =>
      imageType.includes(key),
    );
  });

  return imageUrlFromRecord(found);
};

const getImagePairFromSource = (
  source: any,
) => {
  const rawImages = parseImages(
    source?.images,
  );

  const front = firstValue(
    source?.front_image_url,
    source?.frontImageUrl,
    source?.front_url,
    source?.frontUrl,
    imageByType(
      rawImages,
      "front",
      "primary",
    ),
    source?.image_url,
    source?.imageUrl,
    source?.main_image_url,
    source?.mainImageUrl,
    imageByType(
      rawImages,
      "main",
      "default",
    ),
    rawImages[0],
  );

  const back = firstValue(
    source?.back_image_url,
    source?.backImageUrl,
    source?.back_url,
    source?.backUrl,
    source?.rear_image_url,
    source?.rearImageUrl,
    imageByType(
      rawImages,
      "back",
      "rear",
    ),
  );

  return uniqueImages([
    front,
    back,
  ]).slice(0, 2);
};

const getDetailVariants = (row: any) => {
  if (
    Array.isArray(row?.variants) &&
    row.variants.length
  ) {
    return row.variants;
  }

  if (
    Array.isArray(row?.color_variants) &&
    row.color_variants.length
  ) {
    return row.color_variants;
  }

  if (
    Array.isArray(row?.colorVariants) &&
    row.colorVariants.length
  ) {
    return row.colorVariants;
  }

  return [row];
};

const getVariantIdValue = (
  variant: any,
  row: any = {},
) =>
  firstValue(
    variant?.variant_id,
    variant?.variantId,
    variant?.id,
    row?.variant_id,
    row?.variantId,
    row?.primary_variant_id,
    row?.primaryVariantId,
  );

const getVariantBarcodeValue = (
  variant: any,
  row: any = {},
) =>
  String(
    firstValue(
      variant?.barcode,
      variant?.ean_code,
      variant?.eanCode,
      row?.barcode,
      row?.ean_code,
      row?.eanCode,
    ),
  ).trim();

const getVariantColorValue = (
  variant: any,
  row: any = {},
) =>
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

const getVariantSizeValue = (
  variant: any,
  row: any = {},
) =>
  cleanSingleValue(
    firstValue(
      variant?.size,
      variant?.selected_size,
      variant?.selectedSize,
      row?.size,
      row?.selected_size,
      row?.selectedSize,
    ),
  );

const getB2CDiscount = (
  variant: any,
  row: any,
) => {
  return clampDiscount(
    firstValue(
      variant?.b2c_discount_pct,
      variant?.b2cDiscountPct,
      variant?.discount_b2c,
      variant?.discountB2c,
      variant?.b2c_discount,
      variant?.discount_percentage,
      variant?.discount_percent,
      variant?.discount,
      row?.b2c_discount_pct,
      row?.b2cDiscountPct,
      row?.discount_b2c,
      row?.discountB2c,
      row?.b2c_discount,
      row?.discount_percentage,
      row?.discount_percent,
      row?.discount,
      0,
    ),
  );
};

const getB2BDiscount = (
  variant: any,
  row: any,
) => {
  return clampDiscount(
    firstValue(
      variant?.b2b_discount_pct,
      variant?.b2bDiscountPct,
      variant?.discount_b2b,
      variant?.discountB2b,
      variant?.b2b_discount,
      variant?.discount_percentage_b2b,
      row?.b2b_discount_pct,
      row?.b2bDiscountPct,
      row?.discount_b2b,
      row?.discountB2b,
      row?.b2b_discount,
      row?.discount_percentage_b2b,
      0,
    ),
  );
};

const getOriginalB2C = (
  variant: any,
  row: any,
) => {
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

const getDirectB2CPrice = (
  variant: any,
  row: any,
  fallback: number,
) => {
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

const normalizeVariant = (
  variant: any,
  row: any,
) => {
  const productId = firstValue(
    variant?.product_id,
    variant?.productId,
    row?.product_id,
    row?.productId,
    row?.id,
    "",
  );

  const variantId =
    getVariantIdValue(
      variant,
      row,
    ) || "";

  const size =
    getVariantSizeValue(
      variant,
      row,
    );

  const colour =
    getVariantColorValue(
      variant,
      row,
    );

  const barcode =
    getVariantBarcodeValue(
      variant,
      row,
    );

  const b2cDiscount =
    getB2CDiscount(
      variant,
      row,
    );

  const b2bDiscount =
    getB2BDiscount(
      variant,
      row,
    );

  const mrp =
    getOriginalB2C(
      variant,
      row,
    );

  const directSalePrice =
    getDirectB2CPrice(
      variant,
      row,
      mrp,
    );

  const salePrice =
    b2cDiscount > 0 &&
    mrp > 0
      ? calculateDiscountedPrice(
          mrp,
          b2cDiscount,
          directSalePrice,
        )
      : directSalePrice;

  const originalB2B = toNumber(
    firstValue(
      variant?.original_price_b2b,
      variant?.cost_price,
      row?.original_price_b2b,
      row?.cost_price,
      mrp,
    ),
    mrp,
  );

  const finalB2B =
    b2bDiscount > 0 &&
    originalB2B > 0
      ? calculateDiscountedPrice(
          originalB2B,
          b2bDiscount,
          originalB2B,
        )
      : originalB2B;

  const variantImages =
    getImagePairFromSource(variant);

  const rowImages =
    getImagePairFromSource(row);

  const frontImage =
    variantImages[0] ||
    rowImages[0] ||
    "";

  const backImage =
    variantImages[1] ||
    rowImages[1] ||
    "";

  const images = uniqueImages([
    frontImage,
    backImage,
  ]).slice(0, 2);

  const imageUrl =
    images[0] || "";

  const onHand = toNumber(
    firstValue(
      variant?.available_qty,
      variant?.availableQty,
      variant?.on_hand,
      variant?.onHand,
      variant?.stock,
      variant?.quantity,
      row?.available_qty,
      row?.on_hand,
      row?.stock,
      0,
    ),
    0,
  );

  const categoryId = String(
    firstValue(
      variant?.category_id,
      variant?.categoryId,
      row?.category_id,
      row?.categoryId,
      "",
    ),
  );

  const categoryName = String(
    firstValue(
      variant?.category_name,
      variant?.categoryName,
      row?.category_name,
      row?.categoryName,
      "",
    ),
  );

  const categorySlug = String(
    firstValue(
      variant?.category_slug,
      variant?.categorySlug,
      row?.category_slug,
      row?.categorySlug,
      "",
    ),
  );

  const parentCategoryId = String(
    firstValue(
      variant?.parent_category_id,
      variant?.parentCategoryId,
      row?.parent_category_id,
      row?.parentCategoryId,
      "",
    ),
  );

  const parentCategoryName =
    String(
      firstValue(
        variant?.parent_category_name,
        variant?.parentCategoryName,
        row?.parent_category_name,
        row?.parentCategoryName,
        "",
      ),
    );

  const parentCategorySlug =
    String(
      firstValue(
        variant?.parent_category_slug,
        variant?.parentCategorySlug,
        row?.parent_category_slug,
        row?.parentCategorySlug,
        "",
      ),
    );

  const categoryPath = String(
    firstValue(
      variant?.category_path,
      variant?.categoryPath,
      row?.category_path,
      row?.categoryPath,
      [
        parentCategoryName,
        categoryName,
      ]
        .filter(Boolean)
        .join(" > "),
    ),
  );

  return {
    id: String(
      variantId ||
        barcode ||
        "",
    ),
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
    parent_category_id:
      parentCategoryId,
    parentCategoryId,
    parent_category_name:
      parentCategoryName,
    parentCategoryName,
    parent_category_slug:
      parentCategorySlug,
    parentCategorySlug,
    category_path: categoryPath,
    categoryPath,
    size,
    colour,
    color: colour,
    barcode,
    ean_code: barcode,
    eanCode: barcode,
    mrp,
    original_price_b2c: mrp,
    originalPriceB2c: mrp,
    final_price_b2c:
      salePrice,
    finalPriceB2c:
      salePrice,
    sale_price:
      salePrice,
    salePrice,
    price:
      salePrice,
    selling_price:
      salePrice,
    sellingPrice:
      salePrice,
    discounted_price:
      salePrice,
    discountedPrice:
      salePrice,
    mahaveer_price:
      salePrice,
    mahaveerPrice:
      salePrice,
    original_price_b2b:
      originalB2B,
    final_price_b2b:
      finalB2B,
    cost_price:
      originalB2B,
    b2c_discount_pct:
      b2cDiscount,
    b2cDiscountPct:
      b2cDiscount,
    b2b_discount_pct:
      b2bDiscount,
    b2bDiscountPct:
      b2bDiscount,
    discount_b2c:
      b2cDiscount,
    discountB2c:
      b2cDiscount,
    discount:
      b2cDiscount,
    discount_percentage:
      b2cDiscount,
    discount_percent:
      b2cDiscount,
    on_hand:
      onHand,
    onHand,
    available_qty:
      onHand,
    availableQty:
      onHand,
    in_stock:
      onHand > 0,
    inStock:
      onHand > 0,
    image_url:
      imageUrl,
    imageUrl,
    front_image_url:
      images[0] || "",
    frontImageUrl:
      images[0] || "",
    back_image_url:
      images[1] || "",
    backImageUrl:
      images[1] || "",
    main_image_url:
      images[0] || "",
    mainImageUrl:
      images[0] || "",
    images,
    raw: variant,
  };
};

const normalizeProductCard = (
  row: any,
  variants: any[],
  selectedGroup: any[],
): Product => {
  const productName = String(
    row.product_name ||
      row.productName ||
      row.name ||
      row.title ||
      "Product",
  ).trim();

  const brandName = String(
    row.brand_name ||
      row.brandName ||
      row.brand ||
      "Vandhana",
  ).trim();

  const gender =
    toGender(
      row.gender ||
        row.category,
    );

  const actualProductId =
    firstValue(
      row.product_id,
      row.productId,
      row.id,
      "",
    );

  const actualVariantId =
    firstValue(
      row.variant_id,
      row.variantId,
      row.primary_variant_id,
      row.primaryVariantId,
      "",
    );

  const barcode = String(
    firstValue(
      row.barcode,
      row.ean_code,
      row.eanCode,
    ),
  ).trim();

  const imageVariant =
    selectedGroup.find(
      (variant: any) =>
        getImagePairFromSource(
          variant,
        )[0],
    ) ||
    selectedGroup.find(
      (variant: any) =>
        toNumber(
          variant.available_qty ??
            variant.on_hand ??
            0,
          0,
        ) > 0,
    ) ||
    selectedGroup[0] ||
    variants[0] ||
    normalizeVariant(
      row,
      row,
    );

  const routeVariant =
    selectedGroup.find(
      (variant: any) =>
        String(
          variant.variant_id ||
            "",
        ) ===
        String(
          actualVariantId ||
            "",
        ),
    ) ||
    selectedGroup.find(
      (variant: any) =>
        String(
          variant.barcode ||
            "",
        ) ===
        String(
          barcode ||
            "",
        ),
    );

  const selectedVariant =
    routeVariant ||
    imageVariant;

  const selectedColor =
    getVariantColorValue(
      selectedVariant,
      row,
    ) ||
    getVariantColorValue(
      row,
      row,
    );

  const selectedSize =
    getVariantSizeValue(
      selectedVariant,
      row,
    ) ||
    getVariantSizeValue(
      row,
      row,
    );

  const sizeList =
    sortVariantValues(
      variants.map(
        (variant: any) =>
          variant.size,
      ),
    );

  const colorList =
    sortVariantValues(
      variants.map(
        (variant: any) =>
          variant.colour ||
          variant.color,
      ),
    );

  const onHand =
    selectedGroup.reduce(
      (
        sum: number,
        variant: any,
      ) =>
        sum +
        toNumber(
          variant.available_qty ??
            variant.on_hand ??
            0,
          0,
        ),
      0,
    );

  const mrp = toNumber(
    firstValue(
      selectedVariant
        ?.original_price_b2c,
      selectedVariant?.mrp,
      row.mrp,
      row.original_price_b2c,
      row.price,
      0,
    ),
    0,
  );

  const b2cDiscount =
    getB2CDiscount(
      selectedVariant,
      row,
    );

  const directSalePrice =
    getDirectB2CPrice(
      selectedVariant,
      row,
      mrp,
    );

  const salePrice =
    b2cDiscount > 0 &&
    mrp > 0
      ? calculateDiscountedPrice(
          mrp,
          b2cDiscount,
          directSalePrice,
        )
      : directSalePrice;

  const selectedVariantImages =
    getImagePairFromSource(
      selectedVariant,
    );

  const sameColorImageVariant =
    selectedGroup.find(
      (variant: any) =>
        getImagePairFromSource(
          variant,
        )[0],
    );

  const sameColorImages =
    sameColorImageVariant
      ? getImagePairFromSource(
          sameColorImageVariant,
        )
      : [];

  const frontImage =
    selectedVariantImages[0] ||
    sameColorImages[0] ||
    "";

  const backImage =
    selectedVariantImages[1] ||
    sameColorImages[1] ||
    "";

  const images =
    uniqueImages([
      frontImage,
      backImage,
    ]).slice(0, 2);

  const imageUrl =
    images[0] ||
    "/placeholder.svg";

  const cardId = String(
    firstValue(
      selectedVariant?.variant_id,
      selectedVariant?.variantId,
      selectedVariant?.barcode,
      row?.id,
      actualProductId,
      "",
    ),
  );

  const categoryId = String(
    firstValue(
      selectedVariant?.category_id,
      selectedVariant?.categoryId,
      row.category_id,
      row.categoryId,
      "",
    ),
  );

  const categoryName = String(
    firstValue(
      selectedVariant?.category_name,
      selectedVariant?.categoryName,
      row.category_name,
      row.categoryName,
      "",
    ),
  );

  const categorySlug = String(
    firstValue(
      selectedVariant?.category_slug,
      selectedVariant?.categorySlug,
      row.category_slug,
      row.categorySlug,
      "",
    ),
  );

  const parentCategoryId =
    String(
      firstValue(
        selectedVariant
          ?.parent_category_id,
        selectedVariant
          ?.parentCategoryId,
        row.parent_category_id,
        row.parentCategoryId,
        "",
      ),
    );

  const parentCategoryName =
    String(
      firstValue(
        selectedVariant
          ?.parent_category_name,
        selectedVariant
          ?.parentCategoryName,
        row.parent_category_name,
        row.parentCategoryName,
        "",
      ),
    );

  const parentCategorySlug =
    String(
      firstValue(
        selectedVariant
          ?.parent_category_slug,
        selectedVariant
          ?.parentCategorySlug,
        row.parent_category_slug,
        row.parentCategorySlug,
        "",
      ),
    );

  const categoryPath = String(
    firstValue(
      selectedVariant
        ?.category_path,
      selectedVariant
        ?.categoryPath,
      row.category_path,
      row.categoryPath,
      [
        parentCategoryName,
        categoryName,
      ]
        .filter(Boolean)
        .join(" > "),
    ),
  );

  const stockBySize =
    selectedGroup.reduce(
      (
        accumulator:
          Record<string, number>,
        variant: any,
      ) => {
        const size =
          cleanSingleValue(
            variant.size || "",
          );

        if (!size) {
          return accumulator;
        }

        accumulator[size] =
          (
            accumulator[size] ||
            0
          ) +
          toNumber(
            variant.available_qty ??
              variant.on_hand ??
              0,
            0,
          );

        return accumulator;
      },
      {},
    );

  return {
    id: cardId,
    productId:
      actualProductId ||
      selectedVariant?.product_id ||
      selectedVariant?.productId ||
      undefined,
    product_id:
      actualProductId ||
      selectedVariant?.product_id ||
      selectedVariant?.productId ||
      undefined,
    variantId:
      firstValue(
        selectedVariant?.variant_id,
        selectedVariant?.variantId,
        undefined,
      ),
    variant_id:
      firstValue(
        selectedVariant?.variant_id,
        selectedVariant?.variantId,
        undefined,
      ),
    primaryVariantId:
      firstValue(
        selectedVariant?.variant_id,
        selectedVariant?.variantId,
        undefined,
      ),
    primary_variant_id:
      firstValue(
        selectedVariant?.variant_id,
        selectedVariant?.variantId,
        undefined,
      ),
    title: productName,
    product_name: productName,
    name: productName,
    description: String(
      row.description ||
        `${brandName} ${productName}`,
    ).trim(),
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
    parent_category_id:
      parentCategoryId,
    parentCategoryName,
    parent_category_name:
      parentCategoryName,
    parentCategorySlug,
    parent_category_slug:
      parentCategorySlug,
    categoryPath,
    category_path: categoryPath,
    price: salePrice,
    salePrice,
    sale_price: salePrice,
    selling_price: salePrice,
    final_price_b2c:
      salePrice,
    discounted_price:
      salePrice,
    mahaveer_price:
      salePrice,
    originalPrice: mrp,
    original_price_b2c:
      mrp,
    mrp,
    isSale:
      mrp > salePrice,
    discount:
      b2cDiscount,
    discount_b2c:
      b2cDiscount,
    discount_percentage:
      b2cDiscount,
    discount_percent:
      b2cDiscount,
    b2c_discount_pct:
      b2cDiscount,
    images,
    frontImageUrl:
      imageUrl,
    front_image_url:
      imageUrl,
    backImageUrl:
      images[1] || "",
    back_image_url:
      images[1] || "",
    mainImageUrl:
      imageUrl,
    main_image_url:
      imageUrl,
    imageUrl,
    image_url:
      imageUrl,
    barcode:
      firstValue(
        selectedVariant?.barcode,
        barcode,
      ),
    ean_code:
      firstValue(
        selectedVariant?.ean_code,
        selectedVariant?.barcode,
        barcode,
      ),
    eanCode:
      firstValue(
        selectedVariant?.eanCode,
        selectedVariant?.ean_code,
        selectedVariant?.barcode,
        barcode,
      ),
    size:
      selectedSize ||
      sortVariantValues(
        selectedGroup.map(
          (variant: any) =>
            variant.size,
        ),
      )[0] ||
      "",
    colour:
      selectedColor || "",
    color:
      selectedColor || "",
    selectedColor:
      selectedColor || "",
    selected_color:
      selectedColor || "",
    selectedColour:
      selectedColor || "",
    selected_colour:
      selectedColor || "",
    sizes:
      sortVariantValues(
        selectedGroup.map(
          (variant: any) =>
            variant.size,
        ),
      ),
    allSizes:
      sizeList,
    all_sizes:
      sizeList,
    colors:
      colorList,
    colours:
      colorList,
    stockBySize,
    specs: {
      material:
        row.material || "",
      fit:
        row.fit ||
        row.fit_type ||
        "",
      washCare: [],
    },
    ratings: {
      average:
        toNumber(
          row.rating_average ||
            row.rating ||
            4.5,
          4.5,
        ),
      count:
        toNumber(
          row.rating_count ||
            row.reviews ||
            0,
          0,
        ),
    },
    createdAt:
      String(
        row.created_at ||
          row.createdAt ||
          new Date().toISOString(),
      ),
    created_at:
      String(
        row.created_at ||
          row.createdAt ||
          new Date().toISOString(),
      ),
    onHand,
    on_hand:
      onHand,
    available_qty:
      onHand,
    availableQty:
      onHand,
    patternCode:
      String(
        row.pattern_code ||
          row.patternCode ||
          "",
      ).trim(),
    pattern_code:
      String(
        row.pattern_code ||
          row.patternCode ||
          "",
      ).trim(),
    variants,
    colorVariants:
      selectedGroup,
    color_variants:
      selectedGroup,
    variantCount:
      variants.length,
    variant_count:
      variants.length,
    colorVariantCount:
      selectedGroup.length,
    color_variant_count:
      selectedGroup.length,
    raw: row,
  };
};

const normalizeProductCards = (
  row: any,
): Product[] => {
  const rawVariants =
    getDetailVariants(row);

  const allVariants =
    rawVariants
      .map((variant: any) =>
        normalizeVariant(
          variant,
          row,
        ),
      )
      .filter(
        (variant: any) =>
          variant.size ||
          variant.colour ||
          variant.variant_id ||
          variant.barcode,
      );

  const availableVariants =
    allVariants.filter(
      (variant: any) =>
        toNumber(
          variant.available_qty ??
            variant.on_hand ??
            0,
          0,
        ) > 0,
    );

  const variants =
    availableVariants.length
      ? availableVariants
      : allVariants;

  if (!variants.length) {
    const fallback =
      normalizeVariant(
        row,
        row,
      );

    return [
      normalizeProductCard(
        row,
        [fallback],
        [fallback],
      ),
    ];
  }

  const groups =
    new Map<string, any[]>();

  variants.forEach(
    (variant: any) => {
      const color =
        getVariantColorValue(
          variant,
          row,
        );

      const categoryId =
        String(
          firstValue(
            variant?.category_id,
            variant?.categoryId,
            row?.category_id,
            row?.categoryId,
            "",
          ),
        ).trim();

      const key = [
        categoryId ||
          "__no_category__",
        normalizeText(color) ||
          "__default__",
      ].join("|");

      const current =
        groups.get(key) || [];

      current.push(variant);

      groups.set(
        key,
        current,
      );
    },
  );

  return Array.from(
    groups.values(),
  ).map((selectedGroup) =>
    normalizeProductCard(
      row,
      variants,
      selectedGroup,
    ),
  );
};

const readJson = async (
  response: Response,
) => {
  const data =
    await response
      .json()
      .catch(() => []);

  if (!response.ok) {
    throw new Error(
      (data as any)?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return data;
};

const extractRows = (data: any) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.products)) {
    return data.products;
  }

  if (Array.isArray(data?.rows)) {
    return data.rows;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const fetchJson = async (
  url: string,
) => {
  const response = await fetch(
    `${url}${
      url.includes("?")
        ? "&"
        : "?"
    }_ts=${Date.now()}`,
    {
      method: "GET",
      headers: {
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
    },
  );

  return readJson(response);
};

const flattenFallbackCategories =
  () => {
    return fallbackCategories.map(
      (category: any) => ({
        id: String(
          category.id,
        ),
        name:
          category.name,
        slug:
          category.slug,
        image:
          category.image ||
          "/placeholder.svg",
        parentId:
          category.parentId ===
          undefined
            ? category.parent_id ||
              null
            : category.parentId,
        parent_id:
          category.parent_id ===
          undefined
            ? category.parentId ||
              null
            : category.parent_id,
        level:
          Number(
            category.level || 0,
          ),
        gender:
          category.gender,
        categoryPath:
          category.categoryPath ||
          category.category_path ||
          category.name,
        category_path:
          category.category_path ||
          category.categoryPath ||
          category.name,
        children: [],
      }),
    ) as StorefrontCategory[];
  };

const flatToTree = (
  items: StorefrontCategory[],
) => {
  const map =
    new Map<
      string,
      StorefrontCategory
    >();

  const roots:
    StorefrontCategory[] = [];

  items.forEach((item) => {
    map.set(
      String(item.id),
      {
        ...item,
        children: [],
      },
    );
  });

  map.forEach((item) => {
    const parentId =
      item.parentId ||
      item.parent_id ||
      null;

    if (
      parentId &&
      map.has(String(parentId))
    ) {
      map
        .get(
          String(parentId),
        )!
        .children!
        .push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
};

const normalizeCategoryNode = (
  node: any,
  parentId: string | null = null,
): StorefrontCategory => {
  const id = String(
    node.id || "",
  );

  const children =
    Array.isArray(
      node.children,
    )
      ? node.children.map(
          (child: any) =>
            normalizeCategoryNode(
              child,
              id,
            ),
        )
      : [];

  return {
    id,
    name: String(
      node.name || "",
    ),
    slug: String(
      node.slug || "",
    ),
    image:
      node.image ||
      "/placeholder.svg",
    parentId:
      node.parentId ===
      undefined
        ? node.parent_id ??
          parentId
        : node.parentId,
    parent_id:
      node.parent_id ===
      undefined
        ? node.parentId ??
          parentId
        : node.parent_id,
    level:
      Number(
        node.level || 0,
      ),
    gender:
      node.gender,
    categoryPath:
      node.categoryPath ||
      node.category_path ||
      node.name ||
      "",
    category_path:
      node.category_path ||
      node.categoryPath ||
      node.name ||
      "",
    children,
  };
};

export const flattenCategoryTree = (
  tree: StorefrontCategory[],
) => {
  const output:
    StorefrontCategory[] = [];

  const walk = (
    items:
      StorefrontCategory[],
  ) => {
    items.forEach((item) => {
      output.push(item);

      if (
        item.children?.length
      ) {
        walk(item.children);
      }
    });
  };

  walk(tree);

  return output;
};

export const fetchCategoriesTree =
  async (
    gender?:
      ProductGender |
      string,
  ): Promise<
    StorefrontCategory[]
  > => {
    const backendGender =
      gender
        ? toBackendGender(
            gender,
          )
        : "";

    const url =
      backendGender
        ? `${API_BASE}/api/categories/tree?gender=${encodeURIComponent(
            backendGender,
          )}`
        : `${API_BASE}/api/categories/tree`;

    try {
      const data =
        await fetchJson(url);

      return Array.isArray(data)
        ? data.map(
            (node: any) =>
              normalizeCategoryNode(
                node,
              ),
          )
        : [];
    } catch {
      const flat =
        flattenFallbackCategories();

      const filtered =
        backendGender
          ? flat.filter(
              (item) =>
                item.gender ===
                backendGender,
            )
          : flat;

      return flatToTree(
        filtered,
      );
    }
  };

export const fetchCategoriesByGender =
  async (
    gender: ProductGender,
  ): Promise<
    StorefrontCategory[]
  > => {
    const tree =
      await fetchCategoriesTree(
        gender,
      );

    const flat =
      flattenCategoryTree(
        tree,
      );

    const childIds =
      new Set(
        flat
          .map((item) =>
            String(
              item.parentId ||
                item.parent_id ||
                "",
            ),
          )
          .filter(Boolean),
      );

    return flat.filter(
      (item) =>
        item.level > 0 &&
        !childIds.has(
          String(item.id),
        ),
    );
  };

const fetchFromProductsApi =
  async (
    branchId: number,
  ) => {
    const url =
      `${API_BASE}/api/products?branch_id=${encodeURIComponent(
        branchId,
      )}&all=true`;

    const data =
      await fetchJson(url);

    return extractRows(data);
  };

const fetchFromBranchApi =
  async (
    branchId: number,
  ) => {
    const url =
      `${API_BASE}/api/branch/${encodeURIComponent(
        branchId,
      )}/stock`;

    const data =
      await fetchJson(url);

    return extractRows(data);
  };

const getRawProductKey = (
  row: any,
) => {
  const productId =
    String(
      firstValue(
        row?.product_id,
        row?.productId,
      ),
    ).trim();

  if (productId) {
    const categoryId =
      normalizeText(
        row?.category_id ||
          row?.categoryId,
      );

    return [
      `product:${productId}`,
      `category:${
        categoryId || "none"
      }`,
    ].join("|");
  }

  const patternCode =
    normalizeText(
      row?.pattern_code ||
        row?.patternCode,
    );

  if (patternCode) {
    return [
      "pattern",
      normalizeText(
        row?.gender ||
          row?.category,
      ),
      normalizeText(
        row?.category_id ||
          row?.categoryId,
      ),
      normalizeText(
        row?.brand_name ||
          row?.brand,
      ),
      patternCode,
    ].join("|");
  }

  return [
    "details",
    normalizeText(
      row?.gender ||
        row?.category,
    ),
    normalizeText(
      row?.category_id ||
        row?.categoryId,
    ),
    normalizeText(
      row?.brand_name ||
        row?.brand,
    ),
    normalizeText(
      row?.product_name ||
        row?.name ||
        row?.title,
    ),
  ].join("|");
};

const getRawVariants = (
  row: any,
) => {
  if (
    Array.isArray(
      row?.variants,
    ) &&
    row.variants.length
  ) {
    return row.variants;
  }

  if (
    Array.isArray(
      row?.color_variants,
    ) &&
    row.color_variants.length
  ) {
    return row.color_variants;
  }

  if (
    Array.isArray(
      row?.colorVariants,
    ) &&
    row.colorVariants.length
  ) {
    return row.colorVariants;
  }

  return [row];
};

const getRawVariantKey = (
  variant: any,
) => {
  const variantId =
    String(
      firstValue(
        variant?.variant_id,
        variant?.variantId,
        variant?.id,
      ),
    ).trim();

  if (variantId) {
    return `variant:${variantId}`;
  }

  const barcode =
    String(
      firstValue(
        variant?.barcode,
        variant?.ean_code,
        variant?.eanCode,
      ),
    ).trim();

  if (barcode) {
    return `barcode:${barcode.toLowerCase()}`;
  }

  return [
    "details",
    normalizeText(
      variant?.size,
    ),
    normalizeText(
      variant?.colour ||
        variant?.color,
    ),
    normalizeText(
      variant?.mrp ||
        variant?.original_price_b2c,
    ),
    normalizeText(
      variant?.sale_price ||
        variant?.final_price_b2c,
    ),
  ].join("|");
};

const mergeRawProductRows = (
  rows: any[],
) => {
  const groups =
    new Map<
      string,
      {
        base: any;
        variants:
          Map<string, any>;
      }
    >();

  rows.forEach((row) => {
    if (
      !row ||
      typeof row !== "object"
    ) {
      return;
    }

    const key =
      getRawProductKey(row);

    if (!groups.has(key)) {
      groups.set(key, {
        base: {
          ...row,
        },
        variants:
          new Map<
            string,
            any
          >(),
      });
    }

    const group =
      groups.get(key)!;

    Object.entries(
      row,
    ).forEach(
      ([field, value]) => {
        const current =
          group.base[field];

        const currentMissing =
          current === undefined ||
          current === null ||
          current === "" ||
          (
            Array.isArray(
              current,
            ) &&
            current.length === 0
          );

        const nextPresent =
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (
            !Array.isArray(
              value,
            ) ||
            value.length > 0
          );

        if (
          currentMissing &&
          nextPresent
        ) {
          group.base[field] =
            value;
        }
      },
    );

    getRawVariants(
      row,
    ).forEach(
      (variant: any) => {
        const variantKey =
          getRawVariantKey(
            variant,
          );

        if (
          !group.variants.has(
            variantKey,
          )
        ) {
          group.variants.set(
            variantKey,
            variant,
          );
        }
      },
    );
  });

  return Array.from(
    groups.values(),
  ).map((group) => ({
    ...group.base,
    variants:
      Array.from(
        group.variants.values(),
      ),
  }));
};

const getProductIdentityKey = (
  product: any,
) => {
  const productId =
    String(
      firstValue(
        product?.productId,
        product?.product_id,
      ),
    ).trim();

  const color =
    normalizeText(
      firstValue(
        product?.selectedColor,
        product?.selected_color,
        product?.selectedColour,
        product?.selected_colour,
        product?.colour,
        product?.color,
      ),
    );

  if (productId) {
    const categoryId =
      normalizeText(
        product?.categoryId ||
          product?.category_id,
      );

    return [
      `product:${productId}`,
      `category:${
        categoryId || "none"
      }`,
      `color:${
        color || "default"
      }`,
    ].join("|");
  }

  const patternCode =
    normalizeText(
      product?.patternCode ||
        product?.pattern_code,
    );

  if (patternCode) {
    return [
      "pattern",
      normalizeText(
        product?.gender ||
          product?.category,
      ),
      normalizeText(
        product?.categoryId ||
          product?.category_id,
      ),
      normalizeText(
        product?.brand ||
          product?.brand_name,
      ),
      patternCode,
      color ||
        "default",
    ].join("|");
  }

  return [
    "details",
    normalizeText(
      product?.gender ||
        product?.category,
    ),
    normalizeText(
      product?.categoryId ||
        product?.category_id,
    ),
    normalizeText(
      product?.brand ||
        product?.brand_name,
    ),
    normalizeText(
      product?.title ||
        product?.product_name ||
        product?.name,
    ),
    color ||
      "default",
  ].join("|");
};

const dedupeProducts = (
  products: Product[],
) => {
  const map =
    new Map<
      string,
      Product
    >();

  products.forEach(
    (product: any) => {
      const key =
        getProductIdentityKey(
          product,
        );

      if (!map.has(key)) {
        map.set(
          key,
          product,
        );
      }
    },
  );

  return Array.from(
    map.values(),
  );
};

export const productMatchesCategoryId =
  (
    product: any,
    categoryId:
      string |
      number,
  ) => {
    const target =
      String(
        categoryId || "",
      ).trim();

    if (!target) {
      return true;
    }

    return (
      String(
        product?.categoryId ||
          product?.category_id ||
          "",
      ).trim() === target
    );
  };

export const productMatchesCategorySlug =
  (
    product: any,
    slug: string,
  ) => {
    const target =
      normalizeText(slug);

    if (!target) {
      return true;
    }

    return (
      normalizeText(
        product?.categorySlug ||
          product?.category_slug ||
          "",
      ) === target
    );
  };

export const fetchBranchProducts =
  async (
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<Product[]> => {
    let rows: any[] = [];

    try {
      rows =
        await fetchFromBranchApi(
          branchId,
        );
    } catch {
      rows =
        await fetchFromProductsApi(
          branchId,
        );
    }

    if (
      !Array.isArray(rows) ||
      !rows.length
    ) {
      try {
        rows =
          await fetchFromProductsApi(
            branchId,
          );
      } catch {
        rows = [];
      }
    }

    const groupedRows =
      mergeRawProductRows(
        rows,
      );

    const products =
      groupedRows
        .flatMap(
          normalizeProductCards,
        )
        .filter(
          (product) =>
            product.id,
        );

    return dedupeProducts(
      products,
    );
  };

export const fetchProductsByGender =
  async (
    gender: ProductGender,
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<Product[]> => {
    const products =
      await fetchBranchProducts(
        branchId,
      );

    return products.filter(
      (product) =>
        product.gender.toLowerCase() ===
        gender.toLowerCase(),
    );
  };

export const fetchProductsByCategoryId =
  async (
    categoryId:
      string |
      number,
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<Product[]> => {
    const products =
      await fetchBranchProducts(
        branchId,
      );

    return products.filter(
      (product) =>
        productMatchesCategoryId(
          product,
          categoryId,
        ),
    );
  };

export const fetchProductsByCategorySlug =
  async (
    categorySlug: string,
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<Product[]> => {
    const products =
      await fetchBranchProducts(
        branchId,
      );

    return products.filter(
      (product) =>
        productMatchesCategorySlug(
          product,
          categorySlug,
        ),
    );
  };

export const fetchProductById =
  async (
    id:
      string |
      number,
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<
    Product |
    null
  > => {
    const products =
      await fetchBranchProducts(
        branchId,
      );

    const target =
      String(
        id || "",
      ).trim();

    const colorVariantMatch =
      products.find(
        (product: any) => {
          const colorVariants =
            Array.isArray(
              product.colorVariants,
            )
              ? product.colorVariants
              : Array.isArray(
                    product.color_variants,
                  )
                ? product.color_variants
                : [];

          return colorVariants.some(
            (variant: any) =>
              String(
                variant.variant_id ||
                  "",
              ).trim() === target ||
              String(
                variant.variantId ||
                  "",
              ).trim() === target ||
              String(
                variant.id ||
                  "",
              ).trim() === target ||
              String(
                variant.barcode ||
                  "",
              ).trim() === target ||
              String(
                variant.ean_code ||
                  "",
              ).trim() === target ||
              String(
                variant.eanCode ||
                  "",
              ).trim() === target,
          );
        },
      );

    if (colorVariantMatch) {
      return colorVariantMatch;
    }

    const variantMatch =
      products.find(
        (product: any) =>
          Array.isArray(
            product.variants,
          ) &&
          product.variants.some(
            (variant: any) =>
              String(
                variant.variant_id ||
                  "",
              ).trim() === target ||
              String(
                variant.variantId ||
                  "",
              ).trim() === target ||
              String(
                variant.id ||
                  "",
              ).trim() === target ||
              String(
                variant.barcode ||
                  "",
              ).trim() === target ||
              String(
                variant.ean_code ||
                  "",
              ).trim() === target ||
              String(
                variant.eanCode ||
                  "",
              ).trim() === target,
          ),
      );

    if (variantMatch) {
      return variantMatch;
    }

    return (
      products.find(
        (product: any) =>
          String(
            product.id || "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.variantId ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.variant_id ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.primaryVariantId ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.primary_variant_id ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.barcode ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.ean_code ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.productId ||
              "",
          ).trim() === target,
      ) ||
      products.find(
        (product: any) =>
          String(
            product.product_id ||
              "",
          ).trim() === target,
      ) ||
      null
    );
  };