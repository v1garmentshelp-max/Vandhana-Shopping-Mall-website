import type { Product, ProductGender } from "../Models/Product";
import categoriesJson from "../Data/categories.json";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";
const DEFAULT_BRANCH_ID = 3;
const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1200' viewBox='0 0 900 1200'%3E%3Crect width='900' height='1200' fill='%23f3f4f6'/%3E%3Cpath d='M315 540h270v120H315z' fill='%23e5e7eb'/%3E%3C/svg%3E";

type Row = Record<string, any>;
type ImageKind = "front" | "back" | "";

type ProductFetchOptions = {
  gender?: ProductGender | string;
  categoryId?: string | number;
};

type ImageRecord = {
  image_url: string;
  imageUrl: string;
  image_type: ImageKind;
  imageType: ImageKind;
  product_id?: string | number;
  productId?: string | number;
  variant_id?: string | number;
  variantId?: string | number;
  barcode?: string;
  ean_code?: string;
  eanCode?: string;
  colour?: string;
  color?: string;
};

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

const fallbackCategories = categoriesJson as StorefrontCategory[];

const clean = (value: any) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const norm = (value: any) =>
  clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[./_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const first = (...values: any[]) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  ) ?? "";

const numeric = (value: any, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const percentage = (value: any) =>
  Math.min(100, Math.max(0, numeric(value)));

const money = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const uniqueText = (values: any[]) =>
  Array.from(
    new Map(
      values
        .map(clean)
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value]),
    ).values(),
  );

const toGender = (value: any): ProductGender => {
  const gender = norm(value);

  if (gender.includes("women")) {
    return "Women";
  }

  if (
    gender.includes("kid") ||
    gender.includes("boy") ||
    gender.includes("girl")
  ) {
    return "Kids";
  }

  return "Men";
};

const toBackendGender = (value: ProductGender | string) => {
  const gender = norm(value);

  if (gender === "women") {
    return "WOMEN";
  }

  if (gender === "kids" || gender === "kid") {
    return "KIDS";
  }

  return "MEN";
};

const parseArray = (value: any): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return /^https?:\/\//i.test(value) ||
      value.startsWith("/") ||
      value.startsWith("data:image/")
      ? [value]
      : [];
  }
};

const imageUrl = (value: any) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return clean(
    value.image_url ||
      value.imageUrl ||
      value.secure_url ||
      value.url ||
      "",
  );
};

const validImage = (value: any) => {
  const url = imageUrl(value).toLowerCase();

  return Boolean(
    url &&
      url !== "[object object]" &&
      !url.includes("undefined") &&
      !url.includes("null") &&
      !url.includes("placeholder.svg"),
  );
};

const imageKindFromText = (value: any): ImageKind => {
  const source = norm(value);

  if (
    source.includes("back") ||
    source.includes("rear") ||
    source.includes("reverse")
  ) {
    return "back";
  }

  if (
    source.includes("front") ||
    source.includes("primary") ||
    source.includes("main") ||
    source.includes("default")
  ) {
    return "front";
  }

  return "";
};

const imageKind = (value: any): ImageKind => {
  const explicit = imageKindFromText(
    value?.image_type ||
      value?.imageType ||
      value?.type ||
      value?.label ||
      value?.name ||
      value?.view ||
      value?.position,
  );

  if (explicit) {
    return explicit;
  }

  try {
    return imageKindFromText(
      decodeURIComponent(imageUrl(value).split("?")[0])
        .split("/")
        .pop(),
    );
  } catch {
    return "";
  }
};

const codeFromImageUrl = (url: any) => {
  try {
    const filename =
      decodeURIComponent(imageUrl(url).split("?")[0])
        .split("/")
        .pop() || "";

    const stem = filename.replace(/\.[a-z0-9]+$/i, "");
    const doubleUnderscore = stem.split("__")[0];

    if (/\d{5,}/.test(doubleUnderscore)) {
      return clean(doubleUnderscore).toUpperCase();
    }

    const match = stem.match(
      /[A-Za-z0-9._-]*\d{5,}[A-Za-z0-9._-]*/,
    );

    return match ? clean(match[0]).toUpperCase() : "";
  } catch {
    return "";
  }
};

const normalizeImageRecord = (
  value: any,
  source: Row = {},
  forcedType: ImageKind = "",
): ImageRecord | null => {
  const url = imageUrl(value);

  if (!validImage(url)) {
    return null;
  }

  const barcode = clean(
    first(
      value?.barcode,
      value?.ean_code,
      value?.eanCode,
      codeFromImageUrl(url),
      source?.barcode,
      source?.ean_code,
      source?.eanCode,
      "",
    ),
  );

  const type = forcedType || imageKind(value);

  return {
    image_url: url,
    imageUrl: url,
    image_type: type,
    imageType: type,
    product_id: first(
      value?.product_id,
      value?.productId,
      source?.product_id,
      source?.productId,
      "",
    ),
    productId: first(
      value?.productId,
      value?.product_id,
      source?.productId,
      source?.product_id,
      "",
    ),
    variant_id: first(
      value?.variant_id,
      value?.variantId,
      source?.variant_id,
      source?.variantId,
      "",
    ),
    variantId: first(
      value?.variantId,
      value?.variant_id,
      source?.variantId,
      source?.variant_id,
      "",
    ),
    barcode,
    ean_code: barcode,
    eanCode: barcode,
    colour: clean(
      first(
        value?.colour,
        value?.color,
        source?.colour,
        source?.color,
        "",
      ),
    ),
    color: clean(
      first(
        value?.color,
        value?.colour,
        source?.color,
        source?.colour,
        "",
      ),
    ),
  };
};

const collectImageRecords = (source: Row = {}) => {
  const records: ImageRecord[] = [];

  const add = (value: any, type: ImageKind = "") => {
    const record = normalizeImageRecord(value, source, type);

    if (record) {
      records.push(record);
    }
  };

  [
    source.images,
    source.product_images,
    source.productImages,
    source.variant_images,
    source.variantImages,
  ].forEach((value) =>
    parseArray(value).forEach((item) => add(item)),
  );

  [
    source.front_image_url,
    source.frontImageUrl,
    source.front_url,
    source.frontUrl,
  ].forEach((value) => add(value, "front"));

  [
    source.back_image_url,
    source.backImageUrl,
    source.back_url,
    source.backUrl,
    source.rear_image_url,
    source.rearImageUrl,
  ].forEach((value) => add(value, "back"));

  [
    source.main_image_url,
    source.mainImageUrl,
    source.image_url,
    source.imageUrl,
  ].forEach((value) => add(value, "front"));

  return records;
};

const mergeImageRecords = (...groups: ImageRecord[][]) => {
  const map = new Map<string, ImageRecord>();

  groups.flat().forEach((record) => {
    if (!record || !validImage(record.image_url)) {
      return;
    }

    const key = record.image_url.toLowerCase();
    const current = map.get(key);

    if (!current) {
      map.set(key, record);
      return;
    }

    map.set(key, {
      ...record,
      ...current,
      image_type: current.image_type || record.image_type,
      imageType: current.imageType || record.imageType,
      product_id: current.product_id || record.product_id,
      productId: current.productId || record.productId,
      variant_id: current.variant_id || record.variant_id,
      variantId: current.variantId || record.variantId,
      barcode: current.barcode || record.barcode,
      ean_code: current.ean_code || record.ean_code,
      eanCode: current.eanCode || record.eanCode,
      colour: current.colour || record.colour,
      color: current.color || record.color,
    });
  });

  return Array.from(map.values());
};

const chooseImagePair = (records: ImageRecord[]) => {
  const merged = mergeImageRecords(records);

  const front =
    merged.find((record) => record.image_type === "front") ||
    merged.find((record) => !record.image_type) ||
    null;

  const back =
    merged.find(
      (record) =>
        record.image_type === "back" &&
        record.image_url.toLowerCase() !==
          front?.image_url.toLowerCase(),
    ) || null;

  return {
    records: [front, back].filter(Boolean) as ImageRecord[],
    front,
    back,
  };
};

const rawVariants = (row: Row) => {
  if (Array.isArray(row.variants) && row.variants.length) {
    return row.variants;
  }

  if (
    Array.isArray(row.color_variants) &&
    row.color_variants.length
  ) {
    return row.color_variants;
  }

  if (
    Array.isArray(row.colorVariants) &&
    row.colorVariants.length
  ) {
    return row.colorVariants;
  }

  return [row];
};

const getColor = (variant: Row, row: Row = {}) =>
  clean(
    first(
      variant.colour,
      variant.color,
      variant.selected_colour,
      variant.selectedColor,
      variant.selected_color,
      row.colour,
      row.color,
      row.selected_colour,
      row.selectedColor,
      row.selected_color,
      row.display_color,
      row.displayColor,
      "",
    ),
  );

const getSize = (variant: Row, row: Row = {}) =>
  clean(
    first(
      variant.size,
      variant.selected_size,
      variant.selectedSize,
      row.size,
      row.selected_size,
      row.selectedSize,
      "",
    ),
  );

const getPattern = (variant: Row, row: Row = {}) =>
  clean(
    first(
      variant.pattern_code,
      variant.patternCode,
      row.pattern_code,
      row.patternCode,
      "",
    ),
  );

const getImageCode = (variant: Row, row: Row = {}) =>
  clean(
    first(
      variant.image_code,
      variant.imageCode,
      row.image_code,
      row.imageCode,
      "",
    ),
  );

const stockOf = (source: Row, fallback: Row = {}) => {
  const findNumber = (...keys: string[]) => {
    for (const record of [source, fallback]) {
      for (const key of keys) {
        const value = record?.[key];

        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== "" &&
          Number.isFinite(Number(value))
        ) {
          return Number(value);
        }
      }
    }

    return null;
  };

  const reserved = Math.max(
    0,
    findNumber(
      "reserved",
      "reserved_qty",
      "reservedQty",
      "reserved_stock",
      "reservedStock",
    ) ?? 0,
  );

  const explicitAvailable = findNumber(
    "available_qty",
    "availableQty",
    "available",
    "available_stock",
    "availableStock",
  );

  const explicitOnHand = findNumber(
    "on_hand",
    "onHand",
    "stock",
    "quantity",
    "qty",
    "inventory_qty",
    "inventoryQty",
  );

  const available = Math.max(
    0,
    explicitAvailable ??
      (explicitOnHand !== null
        ? explicitOnHand - reserved
        : 0),
  );

  return {
    onHand: Math.max(
      0,
      explicitOnHand ?? available + reserved,
    ),
    reserved,
    available,
  };
};

const meaningfulDesignCode = (
  value: any,
  context: any[],
) => {
  const code = norm(value);

  if (!code) {
    return "";
  }

  if (
    new Set(
      context.map(norm).filter(Boolean),
    ).has(code)
  ) {
    return "";
  }

  if (
    new Set([
      "product",
      "design",
      "pattern",
      "style",
      "men",
      "women",
      "kids",
      "half saree",
      "co ord set",
      "coord set",
      "kurthi pant set",
      "night dress",
      "nighty",
      "nightys",
      "jeans",
      "t shirt",
      "t shirts",
      "dress",
    ]).has(code)
  ) {
    return "";
  }

  if (/^\d+$/.test(code) && code.length < 3) {
    return "";
  }

  return code;
};

const imageFamilyKey = (row: Row) => {
  const pair = chooseImagePair(
    collectImageRecords(row),
  );

  const url =
    pair.front?.image_url ||
    pair.back?.image_url ||
    "";

  if (!url) {
    return "";
  }

  try {
    let filename =
      decodeURIComponent(url.split("?")[0])
        .split("/")
        .pop() || "";

    filename = filename.replace(
      /\.[a-z0-9]+$/i,
      "",
    );

    filename = filename.replace(
      /(?:^|[_\-.\s])(front|back|rear|reverse|main|primary|default)(?:$|[_\-.\s])/gi,
      " ",
    );

    const removable = uniqueText([
      first(
        row.barcode,
        row.ean_code,
        row.eanCode,
        "",
      ),
      getSize(row, row),
    ]);

    removable.forEach((value) => {
      const escaped = value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      filename = filename.replace(
        new RegExp(
          `(?:^|[_\\-.\\s])${escaped}(?:$|[_\\-.\\s])`,
          "gi",
        ),
        " ",
      );
    });

    const family = norm(filename);

    return !family ||
      /^\d+$/.test(family) ||
      family.length < 3
      ? ""
      : family;
  } catch {
    return "";
  }
};

const designKey = (row: Row) => {
  const productId = clean(
    first(
      row.product_id,
      row.productId,
      row.id,
      "",
    ),
  );

  const categoryId = clean(
    first(
      row.category_id,
      row.categoryId,
      "",
    ),
  );

  const categoryName = clean(
    first(
      row.category_name,
      row.categoryName,
      row.category_slug,
      row.categorySlug,
      "",
    ),
  );

  const category =
    categoryId ||
    norm(categoryName) ||
    "none";

  const brand = clean(
    first(
      row.brand_name,
      row.brandName,
      row.brand,
      "",
    ),
  );

  const title = clean(
    first(
      row.product_name,
      row.productName,
      row.name,
      row.title,
      "Product",
    ),
  );

  const gender = norm(
    first(
      row.gender,
      row.category,
      "",
    ),
  );

  const colour = norm(
    getColor(row, row),
  );

  const context = [
    title,
    categoryName,
    brand,
    row.category,
  ];

  const imageCode =
    meaningfulDesignCode(
      getImageCode(row, row),
      context,
    );

  const styleCode =
    meaningfulDesignCode(
      first(
        row.design_code,
        row.designCode,
        row.style_code,
        row.styleCode,
        row.model_code,
        row.modelCode,
        "",
      ),
      context,
    );

  const patternCode =
    meaningfulDesignCode(
      getPattern(row, row),
      context,
    );

  if (imageCode) {
    return [
      "image-code",
      gender || "none",
      category,
      norm(brand),
      imageCode,
    ].join("|");
  }

  if (styleCode) {
    return [
      "design-code",
      gender || "none",
      category,
      norm(brand),
      styleCode,
    ].join("|");
  }

  if (patternCode) {
    return [
      "pattern-code",
      gender || "none",
      category,
      norm(brand),
      patternCode,
    ].join("|");
  }

  if (productId && colour) {
    return [
      "product-colour",
      productId,
      category,
      colour,
    ].join("|");
  }

  const family = imageFamilyKey(row);

  if (family) {
    return [
      "image-family",
      gender || "none",
      category,
      norm(brand),
      family,
    ].join("|");
  }

  if (productId) {
    return [
      "product",
      productId,
      category,
    ].join("|");
  }

  return [
    "fallback",
    gender || "none",
    category,
    norm(brand),
    norm(title),
    colour || "none",
    norm(
      first(
        row.barcode,
        row.ean_code,
        row.eanCode,
        "",
      ),
    ) || "none",
    numeric(
      first(
        row.mrp,
        row.original_price_b2c,
        row.price,
        0,
      ),
    ),
  ].join("|");
};

const variantKey = (variant: Row) => {
  const id = clean(
    first(
      variant.variant_id,
      variant.variantId,
      variant.id,
      "",
    ),
  );

  if (id) {
    return `id:${id}`;
  }

  const barcode = clean(
    first(
      variant.barcode,
      variant.ean_code,
      variant.eanCode,
      "",
    ),
  );

  if (barcode) {
    return `barcode:${barcode.toLowerCase()}`;
  }

  return [
    norm(
      variant.product_id ||
        variant.productId,
    ),
    norm(
      variant.colour ||
        variant.color,
    ),
    norm(variant.size),
  ].join("|");
};

const contextualVariant = (
  row: Row,
  variant: Row,
) => {
  const flat: Row = {
    ...row,
    ...variant,
  };

  delete flat.variants;
  delete flat.color_variants;
  delete flat.colorVariants;

  const productId = first(
    variant.product_id,
    variant.productId,
    row.product_id,
    row.productId,
    row.id,
    "",
  );

  const categoryId = first(
    row.category_id,
    row.categoryId,
    variant.category_id,
    variant.categoryId,
    "",
  );

  const categoryName = first(
    row.category_name,
    row.categoryName,
    variant.category_name,
    variant.categoryName,
    "",
  );

  const categorySlug = first(
    row.category_slug,
    row.categorySlug,
    variant.category_slug,
    variant.categorySlug,
    "",
  );

  const parentCategoryId = first(
    row.parent_category_id,
    row.parentCategoryId,
    variant.parent_category_id,
    variant.parentCategoryId,
    "",
  );

  const parentCategoryName = first(
    row.parent_category_name,
    row.parentCategoryName,
    variant.parent_category_name,
    variant.parentCategoryName,
    "",
  );

  const categoryPath = first(
    row.category_path,
    row.categoryPath,
    variant.category_path,
    variant.categoryPath,
    [
      parentCategoryName,
      categoryName,
    ]
      .filter(Boolean)
      .join(" > "),
    "",
  );

  const value: Row = {
    ...flat,
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
    category_path: categoryPath,
    categoryPath,
    gender: first(
      row.gender,
      variant.gender,
      row.category,
      "",
    ),
    pattern_code:
      getPattern(variant, row),
    patternCode:
      getPattern(variant, row),
    image_code:
      getImageCode(variant, row),
    imageCode:
      getImageCode(variant, row),
  };

  const key = designKey(value);

  const records = mergeImageRecords(
    collectImageRecords(row),
    collectImageRecords(variant),
  );

  const pair = chooseImagePair(records);

  return {
    ...value,
    design_key: key,
    designKey: key,
    route_key: key,
    routeKey: key,
    images: records,
    front_image_url:
      pair.front?.image_url || "",
    frontImageUrl:
      pair.front?.image_url || "",
    back_image_url:
      pair.back?.image_url || "",
    backImageUrl:
      pair.back?.image_url || "",
  };
};

const mergeVariantRows = (
  current: Row | undefined,
  incoming: Row,
) => {
  if (!current) {
    return incoming;
  }

  const currentStock = stockOf(current);
  const incomingStock = stockOf(incoming);

  const records = mergeImageRecords(
    collectImageRecords(current),
    collectImageRecords(incoming),
  );

  const pair = chooseImagePair(records);

  return {
    ...current,
    ...incoming,
    product_id: first(
      current.product_id,
      incoming.product_id,
      "",
    ),
    productId: first(
      current.productId,
      incoming.productId,
      "",
    ),
    category_id: first(
      current.category_id,
      incoming.category_id,
      "",
    ),
    categoryId: first(
      current.categoryId,
      incoming.categoryId,
      "",
    ),
    category_name: first(
      current.category_name,
      incoming.category_name,
      "",
    ),
    categoryName: first(
      current.categoryName,
      incoming.categoryName,
      "",
    ),
    category_slug: first(
      current.category_slug,
      incoming.category_slug,
      "",
    ),
    categorySlug: first(
      current.categorySlug,
      incoming.categorySlug,
      "",
    ),
    images: records,
    front_image_url:
      pair.front?.image_url || "",
    frontImageUrl:
      pair.front?.image_url || "",
    back_image_url:
      pair.back?.image_url || "",
    backImageUrl:
      pair.back?.image_url || "",
    on_hand: Math.max(
      currentStock.onHand,
      incomingStock.onHand,
    ),
    onHand: Math.max(
      currentStock.onHand,
      incomingStock.onHand,
    ),
    reserved: Math.max(
      currentStock.reserved,
      incomingStock.reserved,
    ),
    reserved_qty: Math.max(
      currentStock.reserved,
      incomingStock.reserved,
    ),
    reservedQty: Math.max(
      currentStock.reserved,
      incomingStock.reserved,
    ),
    available_qty: Math.max(
      currentStock.available,
      incomingStock.available,
    ),
    availableQty: Math.max(
      currentStock.available,
      incomingStock.available,
    ),
  };
};

const mergeRows = (rows: Row[]) => {
  const groups = new Map<
    string,
    {
      base: Row;
      variants: Map<string, Row>;
    }
  >();

  rows.forEach((row) => {
    rawVariants(row).forEach(
      (variant) => {
        const contextual =
          contextualVariant(
            row,
            variant,
          );

        const key = clean(
          contextual.design_key ||
            contextual.designKey ||
            designKey(contextual),
        );

        if (!groups.has(key)) {
          groups.set(key, {
            base: {
              ...contextual,
              design_key: key,
              designKey: key,
              route_key: key,
              routeKey: key,
            },
            variants:
              new Map<string, Row>(),
          });
        }

        const group =
          groups.get(key)!;

        const baseRecords =
          mergeImageRecords(
            collectImageRecords(
              group.base,
            ),
            collectImageRecords(
              contextual,
            ),
          );

        const basePair =
          chooseImagePair(
            baseRecords,
          );

        group.base = {
          ...group.base,
          images: baseRecords,
          front_image_url:
            basePair.front?.image_url ||
            "",
          frontImageUrl:
            basePair.front?.image_url ||
            "",
          back_image_url:
            basePair.back?.image_url ||
            "",
          backImageUrl:
            basePair.back?.image_url ||
            "",
        };

        const keyValue =
          variantKey(contextual);

        group.variants.set(
          keyValue,
          mergeVariantRows(
            group.variants.get(
              keyValue,
            ),
            contextual,
          ),
        );
      },
    );
  });

  return Array.from(
    groups.values(),
  ).map((group) => ({
    ...group.base,
    variants: Array.from(
      group.variants.values(),
    ),
  }));
};

const normalizeVariant = (
  variant: Row,
  row: Row,
) => {
  const productId = first(
    variant.product_id,
    variant.productId,
    row.product_id,
    row.productId,
    row.id,
    "",
  );

  const variantId = first(
    variant.variant_id,
    variant.variantId,
    variant.id,
    row.variant_id,
    row.variantId,
    row.primary_variant_id,
    row.primaryVariantId,
    "",
  );

  const size = getSize(
    variant,
    row,
  );

  const colour = getColor(
    variant,
    row,
  );

  const barcode = clean(
    first(
      variant.barcode,
      variant.ean_code,
      variant.eanCode,
      row.barcode,
      row.ean_code,
      row.eanCode,
      "",
    ),
  );

  const discount = percentage(
    first(
      variant.b2c_discount_pct,
      variant.b2cDiscountPct,
      variant.discount_b2c,
      variant.discountB2c,
      variant.discount_percentage,
      variant.discount_percent,
      variant.discount,
      row.b2c_discount_pct,
      row.b2cDiscountPct,
      row.discount_b2c,
      row.discountB2c,
      row.discount_percentage,
      row.discount_percent,
      row.discount,
      0,
    ),
  );

  const mrp = numeric(
    first(
      variant.original_price_b2c,
      variant.originalPriceB2c,
      variant.mrp,
      variant.original_price,
      row.original_price_b2c,
      row.originalPriceB2c,
      row.mrp,
      row.original_price,
      row.price,
      0,
    ),
  );

  const directPrice = numeric(
    first(
      variant.final_price_b2c,
      variant.finalPriceB2c,
      variant.b2c_final_price,
      variant.sale_price,
      variant.salePrice,
      variant.price,
      variant.selling_price,
      variant.discounted_price,
      variant.mahaveer_price,
      row.final_price_b2c,
      row.finalPriceB2c,
      row.b2c_final_price,
      row.sale_price,
      row.salePrice,
      row.price,
      row.selling_price,
      row.discounted_price,
      row.mahaveer_price,
      mrp,
    ),
    mrp,
  );

  const salePrice =
    discount > 0 && mrp > 0
      ? money(
          mrp -
            (mrp * discount) / 100,
        )
      : directPrice;

  const stock = stockOf(
    variant,
    row,
  );

  const records =
    mergeImageRecords(
      collectImageRecords(row),
      collectImageRecords(variant),
    );

  const pair = chooseImagePair(records);

  const categoryId = clean(
    first(
      variant.category_id,
      variant.categoryId,
      row.category_id,
      row.categoryId,
      "",
    ),
  );

  const categoryName = clean(
    first(
      variant.category_name,
      variant.categoryName,
      row.category_name,
      row.categoryName,
      "",
    ),
  );

  const categorySlug = clean(
    first(
      variant.category_slug,
      variant.categorySlug,
      row.category_slug,
      row.categorySlug,
      "",
    ),
  );

  const parentCategoryId =
    clean(
      first(
        variant.parent_category_id,
        variant.parentCategoryId,
        row.parent_category_id,
        row.parentCategoryId,
        "",
      ),
    );

  const parentCategoryName =
    clean(
      first(
        variant.parent_category_name,
        variant.parentCategoryName,
        row.parent_category_name,
        row.parentCategoryName,
        "",
      ),
    );

  const categoryPath = clean(
    first(
      variant.category_path,
      variant.categoryPath,
      row.category_path,
      row.categoryPath,
      [
        parentCategoryName,
        categoryName,
      ]
        .filter(Boolean)
        .join(" > "),
      "",
    ),
  );

  const colorValue = clean(
    first(
      variant.colour_hex,
      variant.color_hex,
      variant.colourHex,
      variant.colorHex,
      variant.swatch_color,
      variant.swatchColor,
      row.colour_hex,
      row.color_hex,
      row.colourHex,
      row.colorHex,
      row.swatch_color,
      row.swatchColor,
      "",
    ),
  );

  return {
    id: variantId || barcode,
    variant_id: variantId,
    variantId,
    product_id: productId,
    productId,
    design_key:
      row.design_key ||
      row.designKey ||
      designKey(row),
    designKey:
      row.designKey ||
      row.design_key ||
      designKey(row),
    route_key:
      row.route_key ||
      row.routeKey ||
      row.design_key ||
      row.designKey ||
      designKey(row),
    routeKey:
      row.routeKey ||
      row.route_key ||
      row.designKey ||
      row.design_key ||
      designKey(row),
    pattern_code:
      getPattern(variant, row),
    patternCode:
      getPattern(variant, row),
    image_code:
      getImageCode(variant, row),
    imageCode:
      getImageCode(variant, row),
    category_id: categoryId,
    categoryId,
    category_name:
      categoryName,
    categoryName,
    category_slug:
      categorySlug,
    categorySlug,
    parent_category_id:
      parentCategoryId,
    parentCategoryId,
    parent_category_name:
      parentCategoryName,
    parentCategoryName,
    category_path:
      categoryPath,
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
    final_price_b2c:
      salePrice,
    finalPriceB2c:
      salePrice,
    sale_price: salePrice,
    salePrice,
    price: salePrice,
    selling_price: salePrice,
    sellingPrice: salePrice,
    discounted_price:
      salePrice,
    discountedPrice:
      salePrice,
    mahaveer_price:
      salePrice,
    mahaveerPrice:
      salePrice,
    b2c_discount_pct:
      discount,
    b2cDiscountPct:
      discount,
    discount_b2c: discount,
    discountB2c: discount,
    discount,
    discount_percentage:
      discount,
    discount_percent:
      discount,
    on_hand: stock.onHand,
    onHand: stock.onHand,
    reserved: stock.reserved,
    reserved_qty:
      stock.reserved,
    reservedQty:
      stock.reserved,
    available_qty:
      stock.available,
    availableQty:
      stock.available,
    in_stock:
      stock.available > 0,
    inStock:
      stock.available > 0,
    images: records,
    image_url:
      pair.front?.image_url || "",
    imageUrl:
      pair.front?.image_url || "",
    front_image_url:
      pair.front?.image_url || "",
    frontImageUrl:
      pair.front?.image_url || "",
    back_image_url:
      pair.back?.image_url || "",
    backImageUrl:
      pair.back?.image_url || "",
    main_image_url:
      pair.front?.image_url || "",
    mainImageUrl:
      pair.front?.image_url || "",
    raw: variant,
  };
};

const normalizeProduct = (
  row: Row,
): Product | null => {
  const variants = rawVariants(row)
    .map((variant) =>
      normalizeVariant(
        variant,
        row,
      ),
    )
    .filter(
      (variant) =>
        variant.product_id ||
        variant.variant_id ||
        variant.barcode ||
        variant.size ||
        variant.colour,
    );

  if (!variants.length) {
    return null;
  }

  const stocked =
    variants.filter(
      (variant) =>
        variant.available_qty > 0,
    );

  const usable =
    stocked.length
      ? stocked
      : variants;

  const selected = [...usable].sort(
    (firstVariant, secondVariant) => {
      const firstPrice =
        firstVariant.sale_price > 0
          ? firstVariant.sale_price
          : Number.MAX_SAFE_INTEGER;

      const secondPrice =
        secondVariant.sale_price > 0
          ? secondVariant.sale_price
          : Number.MAX_SAFE_INTEGER;

      return (
        firstPrice -
          secondPrice ||
        secondVariant.available_qty -
          firstVariant.available_qty
      );
    },
  )[0];

  const source =
    selected.raw || row;

  const productId = first(
    selected.product_id,
    selected.productId,
    source.product_id,
    source.productId,
    source.id,
    row.product_id,
    row.productId,
    row.id,
    "",
  );

  const productName = clean(
    first(
      source.product_name,
      source.productName,
      source.name,
      source.title,
      row.product_name,
      row.productName,
      row.name,
      row.title,
      "Product",
    ),
  );

  const brand = clean(
    first(
      source.brand_name,
      source.brandName,
      source.brand,
      row.brand_name,
      row.brandName,
      row.brand,
      "Vandhana",
    ),
  );

  const gender = toGender(
    first(
      source.gender,
      source.category,
      row.gender,
      row.category,
      "",
    ),
  );

  const sizes = uniqueText(
    variants.map(
      (variant) =>
        variant.size,
    ),
  ).sort((firstSize, secondSize) =>
    firstSize.localeCompare(
      secondSize,
      undefined,
      {
        numeric: true,
      },
    ),
  );

  const colors = uniqueText(
    variants.map(
      (variant) =>
        variant.colour,
    ),
  );

  const totals =
    variants.reduce(
      (result, variant) => ({
        onHand:
          result.onHand +
          variant.on_hand,
        reserved:
          result.reserved +
          variant.reserved,
        available:
          result.available +
          variant.available_qty,
      }),
      {
        onHand: 0,
        reserved: 0,
        available: 0,
      },
    );

  const selectedColorVariants =
    variants.filter(
      (variant) =>
        (!selected.product_id ||
          String(
            variant.product_id,
          ) ===
            String(
              selected.product_id,
            )) &&
        (!selected.colour ||
          norm(variant.colour) ===
            norm(
              selected.colour,
            )),
    );

  const records =
    mergeImageRecords(
      selected.images,
      ...selectedColorVariants.map(
        (variant) =>
          variant.images,
      ),
      collectImageRecords(source),
      collectImageRecords(row),
    );

  const allowedBarcodes =
    new Set(
      selectedColorVariants
        .flatMap((variant) => [
          variant.barcode,
          variant.ean_code,
          variant.eanCode,
        ])
        .map(clean)
        .filter(Boolean),
    );

  const selectedRecords =
    records.filter((record) => {
      const recordColor = norm(
        record.colour ||
          record.color,
      );

      const colorMatches =
        !recordColor ||
        !selected.colour ||
        recordColor ===
          norm(selected.colour);

      const recordBarcode =
        clean(
          record.barcode ||
            record.ean_code ||
            record.eanCode,
        );

      const barcodeMatches =
        !recordBarcode ||
        !allowedBarcodes.size ||
        allowedBarcodes.has(
          recordBarcode,
        );

      return (
        colorMatches &&
        barcodeMatches
      );
    });

  const pair = chooseImagePair(
    selectedRecords.length
      ? selectedRecords
      : records,
  );

  const front =
    pair.front?.image_url ||
    FALLBACK_IMAGE;

  const back =
    pair.back?.image_url || "";

  const displayRecords = [
    pair.front,
    pair.back,
  ].filter(Boolean) as ImageRecord[];

  const mrp = selected.mrp || 0;

  const price =
    selected.sale_price ||
    mrp;

  const discount =
    selected.b2c_discount_pct ||
    0;

  const stockBySize =
    variants.reduce(
      (
        result: Record<
          string,
          number
        >,
        variant,
      ) => {
        if (variant.size) {
          result[variant.size] =
            (result[
              variant.size
            ] || 0) +
            variant.available_qty;
        }

        return result;
      },
      {},
    );

  const categoryId = clean(
    first(
      selected.category_id,
      source.category_id,
      source.categoryId,
      row.category_id,
      row.categoryId,
      "",
    ),
  );

  const categoryName = clean(
    first(
      selected.category_name,
      source.category_name,
      source.categoryName,
      row.category_name,
      row.categoryName,
      "",
    ),
  );

  const categorySlug = clean(
    first(
      selected.category_slug,
      source.category_slug,
      source.categorySlug,
      row.category_slug,
      row.categorySlug,
      "",
    ),
  );

  const parentCategoryId =
    clean(
      first(
        selected.parent_category_id,
        source.parent_category_id,
        source.parentCategoryId,
        row.parent_category_id,
        row.parentCategoryId,
        "",
      ),
    );

  const parentCategoryName =
    clean(
      first(
        selected.parent_category_name,
        source.parent_category_name,
        source.parentCategoryName,
        row.parent_category_name,
        row.parentCategoryName,
        "",
      ),
    );

  const categoryPath = clean(
    first(
      selected.category_path,
      source.category_path,
      source.categoryPath,
      row.category_path,
      row.categoryPath,
      [
        parentCategoryName,
        categoryName,
      ]
        .filter(Boolean)
        .join(" > "),
      "",
    ),
  );

  const routeKey = clean(
    row.route_key ||
      row.routeKey ||
      row.design_key ||
      row.designKey ||
      designKey(row),
  );

  const patternCode = clean(
    first(
      selected.pattern_code,
      source.pattern_code,
      source.patternCode,
      row.pattern_code,
      row.patternCode,
      "",
    ),
  );

  const imageCode = clean(
    first(
      selected.image_code,
      source.image_code,
      source.imageCode,
      row.image_code,
      row.imageCode,
      "",
    ),
  );

  const barcodes = uniqueText(
    variants.flatMap((variant) => [
      variant.barcode,
      variant.ean_code,
      variant.eanCode,
    ]),
  );

  return {
    id:
      routeKey ||
      clean(
        first(
          productId,
          selected.variant_id,
          selected.barcode,
          "",
        ),
      ),
    productId,
    product_id: productId,
    variantId:
      selected.variant_id,
    variant_id:
      selected.variant_id,
    primaryVariantId:
      selected.variant_id,
    primary_variant_id:
      selected.variant_id,
    designKey: routeKey,
    design_key: routeKey,
    routeKey,
    route_key: routeKey,
    patternCode,
    pattern_code: patternCode,
    imageCode,
    image_code: imageCode,
    title: productName,
    product_name: productName,
    name: productName,
    description: clean(
      first(
        source.description,
        row.description,
        `${brand} ${productName}`,
      ),
    ),
    brand,
    brand_name: brand,
    gender,
    category: gender,
    categoryId,
    category_id: categoryId,
    categoryName,
    category_name:
      categoryName,
    categorySlug,
    category_slug:
      categorySlug,
    parentCategoryId,
    parent_category_id:
      parentCategoryId,
    parentCategoryName,
    parent_category_name:
      parentCategoryName,
    categoryPath,
    category_path:
      categoryPath,
    price,
    salePrice: price,
    sale_price: price,
    selling_price: price,
    final_price_b2c: price,
    discounted_price: price,
    mahaveer_price: price,
    originalPrice: mrp,
    original_price_b2c: mrp,
    mrp,
    isSale: mrp > price,
    discount,
    discount_b2c: discount,
    discount_percentage:
      discount,
    discount_percent:
      discount,
    b2c_discount_pct:
      discount,
    images:
      displayRecords.length
        ? displayRecords
        : [
            {
              image_url: front,
              imageUrl: front,
              image_type: "front",
              imageType: "front",
            },
          ],
    frontImageUrl: front,
    front_image_url: front,
    backImageUrl: back,
    back_image_url: back,
    mainImageUrl: front,
    main_image_url: front,
    imageUrl: front,
    image_url: front,
    barcode:
      selected.barcode || "",
    ean_code:
      selected.ean_code ||
      selected.barcode ||
      "",
    eanCode:
      selected.eanCode ||
      selected.barcode ||
      "",
    barcodes,
    ean_codes: barcodes,
    eanCodes: barcodes,
    size:
      selected.size ||
      sizes[0] ||
      "",
    colour:
      selected.colour || "",
    color:
      selected.colour || "",
    selectedColor:
      selected.colour || "",
    selected_color:
      selected.colour || "",
    selectedColour:
      selected.colour || "",
    selected_colour:
      selected.colour || "",
    sizes,
    allSizes: sizes,
    all_sizes: sizes,
    colors,
    colours: colors,
    stockBySize,
    specs: {
      material: clean(
        first(
          source.material,
          row.material,
          "",
        ),
      ),
      fit: clean(
        first(
          source.fit,
          source.fit_type,
          row.fit,
          row.fit_type,
          "",
        ),
      ),
      washCare: [],
    },
    ratings: {
      average: numeric(
        first(
          source.rating_average,
          source.rating,
          row.rating_average,
          row.rating,
          4.5,
        ),
        4.5,
      ),
      count: numeric(
        first(
          source.rating_count,
          source.reviews,
          row.rating_count,
          row.reviews,
          0,
        ),
      ),
    },
    createdAt: clean(
      first(
        source.created_at,
        source.createdAt,
        row.created_at,
        row.createdAt,
        new Date().toISOString(),
      ),
    ),
    created_at: clean(
      first(
        source.created_at,
        source.createdAt,
        row.created_at,
        row.createdAt,
        new Date().toISOString(),
      ),
    ),
    onHand: totals.onHand,
    on_hand: totals.onHand,
    reserved: totals.reserved,
    reserved_qty:
      totals.reserved,
    reservedQty:
      totals.reserved,
    available_qty:
      totals.available,
    availableQty:
      totals.available,
    in_stock:
      totals.available > 0,
    inStock:
      totals.available > 0,
    variants,
    colorVariants: variants,
    color_variants: variants,
    variantCount:
      variants.length,
    variant_count:
      variants.length,
    colorVariantCount:
      variants.length,
    color_variant_count:
      variants.length,
    raw: row,
  } as unknown as Product;
};

const categoryImage = (category: Row) => {
  if (validImage(category.image)) {
    return clean(category.image);
  }

  return (
    fallbackCategories.find(
      (item) =>
        String(item.id) ===
        String(category.id),
    )?.image ||
    FALLBACK_IMAGE
  );
};

const categoryNode = (
  node: Row,
  parentId: string | null = null,
): StorefrontCategory => {
  const id = String(node.id || "");

  return {
    id,
    name: clean(node.name),
    slug: clean(node.slug),
    image: categoryImage(node),
    parentId:
      node.parentId === undefined
        ? node.parent_id ??
          parentId
        : node.parentId,
    parent_id:
      node.parent_id === undefined
        ? node.parentId ??
          parentId
        : node.parent_id,
    level: Number(
      node.level || 0,
    ),
    gender: node.gender,
    categoryPath: clean(
      node.categoryPath ||
        node.category_path ||
        node.name,
    ),
    category_path: clean(
      node.category_path ||
        node.categoryPath ||
        node.name,
    ),
    is_active:
      node.is_active !== false,
    sort_order: Number(
      node.sort_order || 0,
    ),
    children: Array.isArray(
      node.children,
    )
      ? node.children.map(
          (child: Row) =>
            categoryNode(
              child,
              id,
            ),
        )
      : [],
  };
};

const flatTree = (
  items: StorefrontCategory[],
) => {
  const map = new Map(
    items.map((item) => [
      String(item.id),
      {
        ...item,
        children: [],
      } as StorefrontCategory,
    ]),
  );

  const roots:
    StorefrontCategory[] = [];

  map.forEach((item) => {
    const parent =
      item.parentId ||
      item.parent_id;

    if (
      parent &&
      map.has(String(parent))
    ) {
      map
        .get(String(parent))!
        .children!.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
};

const fetchJson = async (
  url: string,
) => {
  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
    },
  );

  const data = await response
    .json()
    .catch(() => []);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return data;
};

const rowsFrom = (data: any) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (
    Array.isArray(data?.products)
  ) {
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

export const flattenCategoryTree = (
  tree: StorefrontCategory[],
) => {
  const result:
    StorefrontCategory[] = [];

  const walk = (
    items: StorefrontCategory[],
  ) =>
    items.forEach((item) => {
      result.push(item);

      if (
        item.children?.length
      ) {
        walk(item.children);
      }
    });

  walk(tree);

  return result;
};

export const fetchCategoriesTree =
  async (
    gender?:
      | ProductGender
      | string,
  ): Promise<
    StorefrontCategory[]
  > => {
    const backendGender =
      gender
        ? toBackendGender(gender)
        : "";

    try {
      const data =
        await fetchJson(
          backendGender
            ? `${API_BASE}/api/categories/tree?gender=${encodeURIComponent(backendGender)}&_ts=${Date.now()}`
            : `${API_BASE}/api/categories/tree?_ts=${Date.now()}`,
        );

      return Array.isArray(data)
        ? data.map(
            (node: Row) =>
              categoryNode(node),
          )
        : [];
    } catch {
      const flat =
        fallbackCategories
          .filter(
            (item) =>
              item.is_active !==
              false,
          )
          .map((item) =>
            categoryNode(item),
          );

      return flatTree(
        backendGender
          ? flat.filter(
              (item) =>
                item.gender ===
                backendGender,
            )
          : flat,
      );
    }
  };

export const fetchCategoriesByGender =
  async (
    gender: ProductGender,
  ) =>
    flattenCategoryTree(
      await fetchCategoriesTree(
        gender,
      ),
    ).filter(
      (item) =>
        item.level > 0 &&
        item.is_active !== false,
    );

const fetchRows = async (
  branchId: number,
  options:
    ProductFetchOptions = {},
) => {
  const params =
    new URLSearchParams();

  if (options.gender) {
    params.set(
      "gender",
      toBackendGender(
        options.gender,
      ),
    );
  }

  if (
    clean(options.categoryId)
  ) {
    params.set(
      "category_id",
      clean(options.categoryId),
    );
  }

  params.set("all", "true");
  params.set(
    "_ts",
    String(Date.now()),
  );

  try {
    return rowsFrom(
      await fetchJson(
        `${API_BASE}/api/branch/${encodeURIComponent(branchId)}/stock?${params.toString()}`,
      ),
    );
  } catch {
    return rowsFrom(
      await fetchJson(
        `${API_BASE}/api/products?branch_id=${encodeURIComponent(branchId)}&all=true&_ts=${Date.now()}`,
      ),
    );
  }
};

const productKey = (product: Row) =>
  clean(
    product.routeKey ||
      product.route_key ||
      product.designKey ||
      product.design_key,
  ) ||
  `product:${clean(
    first(
      product.productId,
      product.product_id,
      product.id,
      "",
    ),
  )}|category:${clean(
    first(
      product.categoryId,
      product.category_id,
      "",
    ),
  )}|colour:${norm(
    first(
      product.selectedColor,
      product.selected_color,
      product.colour,
      product.color,
      "",
    ),
  )}`;

export const productMatchesCategoryId =
  (
    product: Row,
    categoryId:
      | string
      | number,
  ) =>
    !clean(categoryId) ||
    clean(
      first(
        product.categoryId,
        product.category_id,
        "",
      ),
    ) === clean(categoryId);

export const productMatchesCategorySlug =
  (
    product: Row,
    slug: string,
  ) =>
    !norm(slug) ||
    norm(
      first(
        product.categorySlug,
        product.category_slug,
        "",
      ),
    ) === norm(slug);

export const fetchBranchProducts =
  async (
    branchId =
      DEFAULT_BRANCH_ID,
    options:
      ProductFetchOptions = {},
  ): Promise<Product[]> => {
    let products = mergeRows(
      await fetchRows(
        branchId,
        options,
      ),
    )
      .map(normalizeProduct)
      .filter(
        Boolean,
      ) as Product[];

    if (options.gender) {
      const gender =
        toGender(
          options.gender,
        ).toLowerCase();

      products =
        products.filter(
          (product) =>
            String(
              (product as any)
                .gender || "",
            ).toLowerCase() ===
            gender,
        );
    }

    return Array.from(
      new Map(
        products.map(
          (product) => [
            productKey(product),
            product,
          ],
        ),
      ).values(),
    );
  };

export const fetchProductsByGender =
  (
    gender: ProductGender,
    branchId =
      DEFAULT_BRANCH_ID,
  ) =>
    fetchBranchProducts(
      branchId,
      {
        gender,
      },
    );

const descendantCategoryIds = (
  tree: StorefrontCategory[],
  categoryId:
    | string
    | number,
) => {
  const target = clean(categoryId);

  const flat =
    flattenCategoryTree(tree);

  const ids =
    new Set<string>(
      target ? [target] : [],
    );

  let changed = true;

  while (changed) {
    changed = false;

    flat.forEach((category) => {
      const id =
        clean(category.id);

      const parent = clean(
        category.parentId ||
          category.parent_id,
      );

      if (
        id &&
        parent &&
        ids.has(parent) &&
        !ids.has(id)
      ) {
        ids.add(id);
        changed = true;
      }
    });
  }

  return ids;
};

export const fetchProductsByCategoryId =
  async (
    categoryId:
      | string
      | number,
    branchId =
      DEFAULT_BRANCH_ID,
  ) => {
    const [products, tree] =
      await Promise.all([
        fetchBranchProducts(
          branchId,
          {
            categoryId,
          },
        ),
        fetchCategoriesTree(),
      ]);

    const allowed =
      descendantCategoryIds(
        tree,
        categoryId,
      );

    return products.filter(
      (product: any) =>
        allowed.has(
          clean(
            first(
              product.categoryId,
              product.category_id,
              "",
            ),
          ),
        ),
    );
  };

export const fetchProductsByCategorySlug =
  async (
    slug: string,
    branchId =
      DEFAULT_BRANCH_ID,
  ) =>
    (
      await fetchBranchProducts(
        branchId,
      )
    ).filter((product) =>
      productMatchesCategorySlug(
        product,
        slug,
      ),
    );

const variantsOf = (product: Row) =>
  Array.isArray(product.variants)
    ? product.variants
    : [];

const topMatch = (
  product: Row,
  target: string,
  fields: string[],
) =>
  fields.some(
    (field) =>
      clean(product[field]) === target,
  );

const variantMatch = (
  product: Row,
  target: string,
  fields: string[],
) =>
  variantsOf(product).some(
    (variant: Row) =>
      fields.some(
        (field) =>
          clean(variant[field]) ===
          target,
      ),
  );

export const fetchProductById =
  async (
    id: string | number,
    branchId =
      DEFAULT_BRANCH_ID,
  ): Promise<Product | null> => {
    const products =
      await fetchBranchProducts(
        branchId,
      );

    const target = clean(id);

    if (!target) {
      return null;
    }

    return (
      products.find((product) =>
        topMatch(
          product,
          target,
          [
            "routeKey",
            "route_key",
            "designKey",
            "design_key",
          ],
        ),
      ) ||
      products.find((product) =>
        topMatch(
          product,
          target,
          ["product_id"],
        ),
      ) ||
      products.find((product) =>
        topMatch(
          product,
          target,
          ["productId"],
        ),
      ) ||
      products.find((product) =>
        variantMatch(
          product,
          target,
          ["product_id"],
        ),
      ) ||
      products.find((product) =>
        variantMatch(
          product,
          target,
          ["productId"],
        ),
      ) ||
      products.find((product) =>
        topMatch(
          product,
          target,
          [
            "variant_id",
            "variantId",
            "primary_variant_id",
            "primaryVariantId",
          ],
        ),
      ) ||
      products.find((product) =>
        variantMatch(
          product,
          target,
          [
            "variant_id",
            "variantId",
            "id",
          ],
        ),
      ) ||
      products.find((product) =>
        topMatch(
          product,
          target,
          [
            "barcode",
            "ean_code",
            "eanCode",
          ],
        ),
      ) ||
      products.find((product) =>
        variantMatch(
          product,
          target,
          [
            "barcode",
            "ean_code",
            "eanCode",
          ],
        ),
      ) ||
      null
    );
  };