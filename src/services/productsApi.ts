import type { Product, ProductGender } from "../Models/Product";
import { resolveColorHex } from "../utils/colorHexMap";
import categoriesJson from "../Data/categories.json";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";
const DEFAULT_BRANCH_ID = 3;
const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1200' viewBox='0 0 900 1200'%3E%3Crect width='900' height='1200' fill='%23f3f4f6'/%3E%3Cpath d='M315 540h270v120H315z' fill='%23e5e7eb'/%3E%3C/svg%3E";

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

export type ProductColorOption = {
    color: string;
    colour: string;
    image: string;
    imageUrl: string;
    image_url: string;
    frontImageUrl: string;
    front_image_url: string;
    backImageUrl: string;
    back_image_url: string;
    colorValue: string;
    colourValue: string;
    available: boolean;
    inStock: boolean;
    in_stock: boolean;
    availableQty: number;
    available_qty: number;
    onHand: number;
    on_hand: number;
    reserved: number;
    sizes: string[];
    barcodes: string[];
    variantId: string | number;
    variant_id: string | number;
    barcode: string;
    eanCode: string;
    ean_code: string;
    images: ImageRecord[];
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
    selectable?: boolean;
    sort_order?: number;
    children?: StorefrontCategory[];
};

const fallbackCategories = categoriesJson as StorefrontCategory[];

const clean = (value: any) => String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const norm = (value: any) => clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[./_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const first = (...values: any[]) => values.find((value) => value !== undefined &&
    value !== null &&
    String(value).trim() !== "") ?? "";

const numeric = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const percentage = (value: any) => Math.min(100, Math.max(0, numeric(value)));

const money = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const uniqueText = (values: any[]) => Array.from(new Map(values
    .map(clean)
    .filter(Boolean)
    .map((value) => [value.toLowerCase(), value])).values());

const toGender = (value: any): ProductGender => {
    const gender = norm(value);

    if (gender.includes("women")) {
        return "Women";
    }

    if (gender.includes("kid") || gender.includes("boy") || gender.includes("girl")) {
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
        return /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:image/") ? [value] : [];
    }
};

const imageUrl = (value: any) => {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value.trim();
    }

    return clean(value.image_url || value.imageUrl || value.secure_url || value.url || "");
};

const validImage = (value: any) => {
    const url = imageUrl(value).toLowerCase();

    return Boolean(
        url &&
        url !== "[object object]" &&
        !url.includes("undefined") &&
        !url.includes("null") &&
        !url.includes("placeholder.svg")
    );
};

const imageKindFromText = (value: any): ImageKind => {
    const source = norm(value);

    if (source.includes("back") || source.includes("rear") || source.includes("reverse")) {
        return "back";
    }

    if (source.includes("front") || source.includes("primary") || source.includes("main") || source.includes("default")) {
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
        value?.position
    );

    if (explicit) {
        return explicit;
    }

    try {
        return imageKindFromText(
            decodeURIComponent(imageUrl(value).split("?")[0])
                .split("/")
                .pop()
        );
    } catch {
        return "";
    }
};

const codeFromImageUrl = (url: any) => {
    try {
        const filename = decodeURIComponent(imageUrl(url).split("?")[0])
            .split("/")
            .pop() || "";

        const stem = filename.replace(/\.[a-z0-9]+$/i, "");
        const doubleUnderscore = stem.split("__")[0];

        if (/\d{5,}/.test(doubleUnderscore)) {
            return clean(doubleUnderscore).toUpperCase();
        }

        const match = stem.match(/[A-Za-z0-9._-]*\d{5,}[A-Za-z0-9._-]*/);

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

    const barcode = clean(first(
        value?.barcode,
        value?.ean_code,
        value?.eanCode,
        codeFromImageUrl(url),
        source?.barcode,
        source?.ean_code,
        source?.eanCode,
        ""
    ));

    const type = forcedType || imageKind(value);

    return {
        image_url: url,
        imageUrl: url,
        image_type: type,
        imageType: type,
        product_id: first(value?.product_id, value?.productId, source?.product_id, source?.productId, ""),
        productId: first(value?.productId, value?.product_id, source?.productId, source?.product_id, ""),
        variant_id: first(value?.variant_id, value?.variantId, source?.variant_id, source?.variantId, ""),
        variantId: first(value?.variantId, value?.variant_id, source?.variantId, source?.variant_id, ""),
        barcode,
        ean_code: barcode,
        eanCode: barcode,
        colour: clean(first(value?.colour, value?.color, source?.colour, source?.color, "")),
        color: clean(first(value?.color, value?.colour, source?.color, source?.colour, "")),
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
    ].forEach((value) => parseArray(value).forEach((item) => add(item)));

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
                record.image_url.toLowerCase() !== front?.image_url.toLowerCase()
        ) || null;

    return {
        records: [front, back].filter(Boolean) as ImageRecord[],
        front,
        back,
    };
};

const rawVariants = (row: Row) => {
    if (Array.isArray(row.color_variants) && row.color_variants.length) {
        return row.color_variants;
    }

    if (Array.isArray(row.colorVariants) && row.colorVariants.length) {
        return row.colorVariants;
    }

    if (Array.isArray(row.listing_variants) && row.listing_variants.length) {
        return row.listing_variants;
    }

    if (Array.isArray(row.listingVariants) && row.listingVariants.length) {
        return row.listingVariants;
    }

    if (Array.isArray(row.variants) && row.variants.length) {
        return row.variants;
    }

    return [row];
};

const getColor = (variant: Row, row: Row = {}) => clean(first(
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
    ""
));

const getSize = (variant: Row, row: Row = {}) => clean(first(
    variant.size,
    variant.selected_size,
    variant.selectedSize,
    row.size,
    row.selected_size,
    row.selectedSize,
    ""
));

const getPattern = (variant: Row, row: Row = {}) => clean(first(
    variant.pattern_code,
    variant.patternCode,
    row.pattern_code,
    row.patternCode,
    ""
));

const getDesignCode = (variant: Row, row: Row = {}) => clean(first(
    variant.source_design_code,
    variant.sourceDesignCode,
    variant.design_code,
    row.source_design_code,
    row.sourceDesignCode,
    row.design_code,
    ""
)).toUpperCase();

const getStorefrontGroupKey = (value: Row) => clean(first(
    value.storefront_group_key,
    value.storefrontGroupKey,
    value.group_key,
    value.groupKey,
    value.route_key,
    value.routeKey,
    value.design_key,
    value.designKey,
    ""
)).toUpperCase();

const getPatternType = (variant: Row, row: Row = {}) => clean(first(
    variant.pattern_type,
    variant.patternType,
    row.pattern_type,
    row.patternType,
    ""
)).toUpperCase();

const physicalMetadata = (variant: Row, row: Row = {}) => ({
    weight: numeric(first(
        variant.weight,
        variant.weight_kg,
        variant.weightKg,
        row.weight,
        row.weight_kg,
        row.weightKg,
        0
    )),
    length: numeric(first(
        variant.length,
        variant.package_length,
        variant.packageLength,
        row.length,
        row.package_length,
        row.packageLength,
        0
    )),
    width: numeric(first(
        variant.width,
        variant.package_width,
        variant.packageWidth,
        row.width,
        row.package_width,
        row.packageWidth,
        0
    )),
    height: numeric(first(
        variant.height,
        variant.package_height,
        variant.packageHeight,
        row.height,
        row.package_height,
        row.packageHeight,
        0
    )),
    hsnCode: clean(first(
        variant.hsn_code,
        variant.hsnCode,
        row.hsn_code,
        row.hsnCode,
        ""
    )),
    hsnPercentage: numeric(first(
        variant.hsn_percentage,
        variant.hsnPercentage,
        variant.tax_percentage,
        variant.taxPercentage,
        row.hsn_percentage,
        row.hsnPercentage,
        row.tax_percentage,
        row.taxPercentage,
        0
    )),
    material: clean(first(
        variant.material,
        row.material,
        ""
    )),
    fitType: clean(first(
        variant.fit_type,
        variant.fitType,
        variant.fit,
        row.fit_type,
        row.fitType,
        row.fit,
        ""
    )),
    markCode: clean(first(
        variant.mark_code,
        variant.markCode,
        row.mark_code,
        row.markCode,
        ""
    )),
});

const getImageCode = (variant: Row, row: Row = {}) => clean(first(
    variant.image_code,
    variant.imageCode,
    row.image_code,
    row.imageCode,
    ""
));

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
            "reservedStock"
        ) ?? 0
    );

    const explicitAvailable = findNumber(
        "available_qty",
        "availableQty",
        "available",
        "available_stock",
        "availableStock"
    );

    const explicitOnHand = findNumber(
        "on_hand",
        "onHand",
        "stock",
        "quantity",
        "qty",
        "inventory_qty",
        "inventoryQty"
    );

    const available = Math.max(
        0,
        explicitAvailable ??
        (explicitOnHand !== null
            ? explicitOnHand - reserved
            : 0)
    );

    return {
        onHand: Math.max(
            0,
            explicitOnHand ?? available + reserved
        ),
        reserved,
        available,
    };
};

const designKey = (row: Row) => {
    const storefrontGroupKey = getStorefrontGroupKey(row);

    if (storefrontGroupKey) {
        return storefrontGroupKey;
    }

    const explicitDesignCode = getDesignCode(row, row);

    if (explicitDesignCode) {
        return explicitDesignCode;
    }

    const productId = clean(first(
        row.product_id,
        row.productId,
        row.id,
        ""
    ));

    if (productId) {
        return `PRODUCT-${productId}`;
    }

    const variantId = clean(first(
        row.variant_id,
        row.variantId,
        ""
    ));

    if (variantId) {
        return `VARIANT-${variantId}`;
    }

    const barcode = clean(first(
        row.barcode,
        row.ean_code,
        row.eanCode,
        ""
    ));

    if (barcode) {
        return `BARCODE-${barcode.toUpperCase()}`;
    }

    return [
        "FALLBACK",
        norm(first(row.gender, row.category, "")) || "NONE",
        norm(first(row.brand_name, row.brandName, row.brand, "")) || "NONE",
        norm(first(
            row.product_name,
            row.productName,
            row.name,
            row.title,
            "PRODUCT"
        )) || "PRODUCT",
    ].join("-");
};

const variantKey = (variant: Row) => {
    const id = clean(first(
        variant.variant_id,
        variant.variantId,
        variant.id,
        ""
    ));

    if (id) {
        return `id:${id}`;
    }

    const barcode = clean(first(
        variant.barcode,
        variant.ean_code,
        variant.eanCode,
        ""
    ));

    if (barcode) {
        return `barcode:${barcode.toLowerCase()}`;
    }

    return [
        norm(variant.product_id || variant.productId),
        norm(variant.colour || variant.color),
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
        ""
    );

    const categoryId = first(
        row.category_id,
        row.categoryId,
        variant.category_id,
        variant.categoryId,
        ""
    );

    const categoryName = first(
        row.category_name,
        row.categoryName,
        variant.category_name,
        variant.categoryName,
        ""
    );

    const categorySlug = first(
        row.category_slug,
        row.categorySlug,
        variant.category_slug,
        variant.categorySlug,
        ""
    );

    const parentCategoryId = first(
        row.parent_category_id,
        row.parentCategoryId,
        variant.parent_category_id,
        variant.parentCategoryId,
        ""
    );

    const parentCategoryName = first(
        row.parent_category_name,
        row.parentCategoryName,
        variant.parent_category_name,
        variant.parentCategoryName,
        ""
    );

    const categoryPath = first(
        row.category_path,
        row.categoryPath,
        variant.category_path,
        variant.categoryPath,
        [
            parentCategoryName,
            categoryName,
        ].filter(Boolean).join(" > "),
        ""
    );

    const storefrontGroupKey =
        getStorefrontGroupKey(variant) ||
        getStorefrontGroupKey(row);

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
        parent_category_id: parentCategoryId,
        parentCategoryId,
        parent_category_name: parentCategoryName,
        parentCategoryName,
        category_path: categoryPath,
        categoryPath,
        gender: first(
            row.gender,
            variant.gender,
            row.category,
            ""
        ),
        design_code: getDesignCode(variant, row),
        designCode: getDesignCode(variant, row),
        storefront_group_key: storefrontGroupKey,
        storefrontGroupKey,
        group_key: storefrontGroupKey || getDesignCode(variant, row),
        groupKey: storefrontGroupKey || getDesignCode(variant, row),
        design_key: storefrontGroupKey || getDesignCode(variant, row),
        designKey: storefrontGroupKey || getDesignCode(variant, row),
        route_key: storefrontGroupKey || getDesignCode(variant, row),
        routeKey: storefrontGroupKey || getDesignCode(variant, row),
        pattern_type: getPatternType(variant, row),
        patternType: getPatternType(variant, row),
        pattern_code: getPattern(variant, row),
        patternCode: getPattern(variant, row),
        image_code: getImageCode(variant, row),
        imageCode: getImageCode(variant, row),
    };

    const key = designKey(value);

    const records = mergeImageRecords(
        collectImageRecords(variant),
        collectImageRecords(row)
    );

    const pair = chooseImagePair(records);

    return {
        ...value,
        design_key: key,
        designKey: key,
        route_key: key,
        routeKey: key,
        images: records,
        front_image_url: pair.front?.image_url || "",
        frontImageUrl: pair.front?.image_url || "",
        back_image_url: pair.back?.image_url || "",
        backImageUrl: pair.back?.image_url || "",
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
        collectImageRecords(incoming)
    );

    const pair = chooseImagePair(records);

    return {
        ...current,
        ...incoming,
        product_id: first(
            current.product_id,
            incoming.product_id,
            ""
        ),
        productId: first(
            current.productId,
            incoming.productId,
            ""
        ),
        category_id: first(
            current.category_id,
            incoming.category_id,
            ""
        ),
        categoryId: first(
            current.categoryId,
            incoming.categoryId,
            ""
        ),
        category_name: first(
            current.category_name,
            incoming.category_name,
            ""
        ),
        categoryName: first(
            current.categoryName,
            incoming.categoryName,
            ""
        ),
        category_slug: first(
            current.category_slug,
            incoming.category_slug,
            ""
        ),
        categorySlug: first(
            current.categorySlug,
            incoming.categorySlug,
            ""
        ),
        images: records,
        front_image_url: pair.front?.image_url || "",
        frontImageUrl: pair.front?.image_url || "",
        back_image_url: pair.back?.image_url || "",
        backImageUrl: pair.back?.image_url || "",
        on_hand: Math.max(
            currentStock.onHand,
            incomingStock.onHand
        ),
        onHand: Math.max(
            currentStock.onHand,
            incomingStock.onHand
        ),
        reserved: Math.max(
            currentStock.reserved,
            incomingStock.reserved
        ),
        reserved_qty: Math.max(
            currentStock.reserved,
            incomingStock.reserved
        ),
        reservedQty: Math.max(
            currentStock.reserved,
            incomingStock.reserved
        ),
        available_qty: Math.max(
            currentStock.available,
            incomingStock.available
        ),
        availableQty: Math.max(
            currentStock.available,
            incomingStock.available
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
        rawVariants(row).forEach((variant) => {
            const contextual =
                contextualVariant(
                    row,
                    variant
                );

            const key = clean(
                contextual.design_key ||
                contextual.designKey ||
                designKey(contextual)
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
                        group.base
                    ),
                    collectImageRecords(
                        contextual
                    )
                );

            const basePair =
                chooseImagePair(
                    baseRecords
                );

            group.base = {
                ...group.base,
                images: baseRecords,
                front_image_url:
                    basePair.front
                        ?.image_url ||
                    "",
                frontImageUrl:
                    basePair.front
                        ?.image_url ||
                    "",
                back_image_url:
                    basePair.back
                        ?.image_url ||
                    "",
                backImageUrl:
                    basePair.back
                        ?.image_url ||
                    "",
            };

            const keyValue =
                variantKey(
                    contextual
                );

            group.variants.set(
                keyValue,
                mergeVariantRows(
                    group.variants.get(
                        keyValue
                    ),
                    contextual
                )
            );
        });
    });

    return Array.from(
        groups.values()
    ).map((group) => ({
        ...group.base,
        variants: Array.from(
            group.variants.values()
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
        ""
    );

    const variantId = first(
        variant.variant_id,
        variant.variantId,
        variant.id,
        row.variant_id,
        row.variantId,
        row.primary_variant_id,
        row.primaryVariantId,
        ""
    );

    const size = getSize(
        variant,
        row
    );

    const colour = getColor(
        variant,
        row
    );

    const barcode = clean(first(
        variant.barcode,
        variant.ean_code,
        variant.eanCode,
        row.barcode,
        row.ean_code,
        row.eanCode,
        ""
    ));

    const discount = percentage(first(
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
        0
    ));

    const mrp = numeric(first(
        variant.original_price_b2c,
        variant.originalPriceB2c,
        variant.mrp,
        variant.original_price,
        row.original_price_b2c,
        row.originalPriceB2c,
        row.mrp,
        row.original_price,
        row.price,
        0
    ));

    const directPrice = numeric(first(
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
        mrp
    ), mrp);

    const salePrice =
        discount > 0 &&
        mrp > 0
            ? money(
                mrp -
                (mrp * discount) / 100
            )
            : directPrice;

    const stock = stockOf(
        variant,
        row
    );

    const records =
        mergeImageRecords(
            collectImageRecords(
                row
            ),
            collectImageRecords(
                variant
            )
        );

    const pair =
        chooseImagePair(
            records
        );

    const categoryId = clean(first(
        variant.category_id,
        variant.categoryId,
        row.category_id,
        row.categoryId,
        ""
    ));

    const categoryName = clean(first(
        variant.category_name,
        variant.categoryName,
        row.category_name,
        row.categoryName,
        ""
    ));

    const categorySlug = clean(first(
        variant.category_slug,
        variant.categorySlug,
        row.category_slug,
        row.categorySlug,
        ""
    ));

    const parentCategoryId =
        clean(first(
            variant.parent_category_id,
            variant.parentCategoryId,
            row.parent_category_id,
            row.parentCategoryId,
            ""
        ));

    const parentCategoryName =
        clean(first(
            variant.parent_category_name,
            variant.parentCategoryName,
            row.parent_category_name,
            row.parentCategoryName,
            ""
        ));

    const categoryPath = clean(first(
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
        ""
    ));

    const colorValue = resolveColorHex(
        colour,
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
            ""
        )
    );

    const designCode =
        getDesignCode(
            variant,
            row
        );

    const storefrontGroupKey =
        getStorefrontGroupKey(
            variant
        ) ||
        getStorefrontGroupKey(
            row
        ) ||
        designKey(
            row
        );

    const patternType =
        getPatternType(
            variant,
            row
        );

    const physical =
        physicalMetadata(
            variant,
            row
        );

    const b2bDiscount =
        percentage(first(
            variant.b2b_discount_pct,
            variant.b2bDiscountPct,
            variant.discount_b2b,
            variant.discountB2b,
            row.b2b_discount_pct,
            row.b2bDiscountPct,
            row.discount_b2b,
            row.discountB2b,
            0
        ));

    const originalB2B = numeric(first(
        variant.original_price_b2b,
        variant.originalPriceB2b,
        variant.cost_price,
        variant.costPrice,
        row.original_price_b2b,
        row.originalPriceB2b,
        row.cost_price,
        row.costPrice,
        mrp
    ), mrp);

    const directB2B = numeric(first(
        variant.final_price_b2b,
        variant.finalPriceB2b,
        variant.b2b_final_price,
        variant.b2bFinalPrice,
        row.final_price_b2b,
        row.finalPriceB2b,
        row.b2b_final_price,
        row.b2bFinalPrice,
        originalB2B
    ), originalB2B);

    const finalB2B =
        b2bDiscount > 0 &&
        originalB2B > 0
            ? money(
                originalB2B -
                (
                    originalB2B *
                    b2bDiscount
                ) /
                100
            )
            : directB2B;

    return {
        id: variantId || barcode,
        variant_id: variantId,
        variantId,
        product_id: productId,
        productId,
        design_code: designCode,
        designCode,
        source_design_code:
            designCode,
        sourceDesignCode:
            designCode,
        storefront_group_key:
            storefrontGroupKey,
        storefrontGroupKey,
        group_key:
            storefrontGroupKey,
        groupKey:
            storefrontGroupKey,
        design_key:
            storefrontGroupKey,
        designKey:
            storefrontGroupKey,
        route_key:
            storefrontGroupKey,
        routeKey:
            storefrontGroupKey,
        pattern_type:
            patternType,
        patternType,
        pattern_code:
            getPattern(
                variant,
                row
            ),
        patternCode:
            getPattern(
                variant,
                row
            ),
        image_code:
            getImageCode(
                variant,
                row
            ),
        imageCode:
            getImageCode(
                variant,
                row
            ),
        category_id:
            categoryId,
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
        colour_hex:
            colorValue,
        color_hex:
            colorValue,
        colourHex:
            colorValue,
        colorHex:
            colorValue,
        swatch_color:
            colorValue,
        swatchColor:
            colorValue,
        barcode,
        ean_code:
            barcode,
        eanCode:
            barcode,
        mrp,
        original_price_b2c:
            mrp,
        originalPriceB2c:
            mrp,
        final_price_b2c:
            salePrice,
        finalPriceB2c:
            salePrice,
        original_price_b2b:
            originalB2B,
        originalPriceB2b:
            originalB2B,
        final_price_b2b:
            finalB2B,
        finalPriceB2b:
            finalB2B,
        b2b_final_price:
            finalB2B,
        b2bFinalPrice:
            finalB2B,
        cost_price:
            originalB2B,
        costPrice:
            originalB2B,
        b2b_discount_pct:
            b2bDiscount,
        b2bDiscountPct:
            b2bDiscount,
        discount_b2b:
            b2bDiscount,
        discountB2b:
            b2bDiscount,
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
        b2c_discount_pct:
            discount,
        b2cDiscountPct:
            discount,
        discount_b2c:
            discount,
        discountB2c:
            discount,
        discount,
        discount_percentage:
            discount,
        discount_percent:
            discount,
        on_hand:
            stock.onHand,
        onHand:
            stock.onHand,
        reserved:
            stock.reserved,
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
        images:
            records,
        image_url:
            pair.front
                ?.image_url ||
            "",
        imageUrl:
            pair.front
                ?.image_url ||
            "",
        front_image_url:
            pair.front
                ?.image_url ||
            "",
        frontImageUrl:
            pair.front
                ?.image_url ||
            "",
        back_image_url:
            pair.back
                ?.image_url ||
            "",
        backImageUrl:
            pair.back
                ?.image_url ||
            "",
        main_image_url:
            pair.front
                ?.image_url ||
            "",
        mainImageUrl:
            pair.front
                ?.image_url ||
            "",
        weight:
            physical.weight,
        weight_kg:
            physical.weight,
        weightKg:
            physical.weight,
        length:
            physical.length,
        width:
            physical.width,
        height:
            physical.height,
        hsn_code:
            physical.hsnCode,
        hsnCode:
            physical.hsnCode,
        hsn_percentage:
            physical.hsnPercentage,
        hsnPercentage:
            physical.hsnPercentage,
        material:
            physical.material,
        fit_type:
            physical.fitType,
        fitType:
            physical.fitType,
        mark_code:
            physical.markCode,
        markCode:
            physical.markCode,
        raw: variant,
    };
};

const buildColorOptions = (
    variants: Row[],
    row: Row,
): ProductColorOption[] => {
    const groups = new Map<
        string,
        {
            color: string;
            variants: Row[];
        }
    >();

    variants.forEach((variant) => {
        const color = clean(first(
            variant.colour,
            variant.color,
            ""
        ));

        const key =
            norm(color);

        if (!color || !key) {
            return;
        }

        if (!groups.has(key)) {
            groups.set(key, {
                color,
                variants: [],
            });
        }

        groups
            .get(key)!
            .variants
            .push(variant);
    });

    return Array.from(
        groups.values()
    ).map(
        ({
            color,
            variants:
                colorVariants,
        }) => {
            const sortedVariants =
                [
                    ...colorVariants,
                ].sort((a, b) => {
                    const aAvailable =
                        numeric(first(
                            a.available_qty,
                            a.availableQty,
                            0
                        ));

                    const bAvailable =
                        numeric(first(
                            b.available_qty,
                            b.availableQty,
                            0
                        ));

                    const aHasImage =
                        validImage(first(
                            a.front_image_url,
                            a.frontImageUrl,
                            a.main_image_url,
                            a.mainImageUrl,
                            a.image_url,
                            a.imageUrl,
                            ""
                        ))
                            ? 1
                            : 0;

                    const bHasImage =
                        validImage(first(
                            b.front_image_url,
                            b.frontImageUrl,
                            b.main_image_url,
                            b.mainImageUrl,
                            b.image_url,
                            b.imageUrl,
                            ""
                        ))
                            ? 1
                            : 0;

                    return (
                        (
                            bAvailable >
                            0
                                ? 1
                                : 0
                        ) -
                        (
                            aAvailable >
                            0
                                ? 1
                                : 0
                        ) ||
                        bHasImage -
                        aHasImage ||
                        bAvailable -
                        aAvailable
                    );
                });

            const representative =
                sortedVariants[0] ||
                colorVariants[0] ||
                {};

            const allowedBarcodes =
                new Set(
                    colorVariants
                        .flatMap(
                            (
                                variant
                            ) => [
                                variant.barcode,
                                variant.ean_code,
                                variant.eanCode,
                            ]
                        )
                        .map(clean)
                        .filter(
                            Boolean
                        )
                );

            const variantRecords =
                mergeImageRecords(
                    ...colorVariants.map(
                        (
                            variant
                        ) =>
                            mergeImageRecords(
                                collectImageRecords(
                                    variant.raw ||
                                    {}
                                ),
                                collectImageRecords(
                                    variant
                                ),
                                Array.isArray(
                                    variant.images
                                )
                                    ? variant.images
                                    : []
                            )
                    )
                );

            const strictRecords =
                variantRecords.filter(
                    (
                        record
                    ) => {
                        const recordColor =
                            norm(first(
                                record.colour,
                                record.color,
                                ""
                            ));

                        const recordBarcode =
                            clean(first(
                                record.barcode,
                                record.ean_code,
                                record.eanCode,
                                ""
                            ));

                        const colorMatches =
                            !recordColor ||
                            recordColor ===
                            norm(
                                color
                            );

                        const barcodeMatches =
                            !recordBarcode ||
                            !allowedBarcodes.size ||
                            allowedBarcodes.has(
                                recordBarcode
                            );

                        return (
                            colorMatches &&
                            barcodeMatches
                        );
                    }
                );

            const preferredRecords =
                strictRecords.length
                    ? strictRecords
                    : variantRecords;

            let pair =
                chooseImagePair(
                    preferredRecords
                );

            if (!pair.front) {
                const directRecords =
                    mergeImageRecords(
                        ...sortedVariants.map(
                            (
                                variant
                            ) =>
                                collectImageRecords({
                                    product_id:
                                        variant.product_id,
                                    productId:
                                        variant.productId,
                                    variant_id:
                                        variant.variant_id,
                                    variantId:
                                        variant.variantId,
                                    barcode:
                                        variant.barcode,
                                    ean_code:
                                        variant.ean_code,
                                    eanCode:
                                        variant.eanCode,
                                    colour:
                                        color,
                                    color,
                                    front_image_url:
                                        variant.front_image_url,
                                    frontImageUrl:
                                        variant.frontImageUrl,
                                    main_image_url:
                                        variant.main_image_url,
                                    mainImageUrl:
                                        variant.mainImageUrl,
                                    image_url:
                                        variant.image_url,
                                    imageUrl:
                                        variant.imageUrl,
                                    back_image_url:
                                        variant.back_image_url,
                                    backImageUrl:
                                        variant.backImageUrl,
                                })
                        )
                    );

                pair =
                    chooseImagePair(
                        directRecords
                    );
            }

            if (!pair.front) {
                const rowRecords =
                    collectImageRecords(
                        row
                    ).filter(
                        (
                            record
                        ) => {
                            const recordColor =
                                norm(first(
                                    record.colour,
                                    record.color,
                                    ""
                                ));

                            const recordBarcode =
                                clean(first(
                                    record.barcode,
                                    record.ean_code,
                                    record.eanCode,
                                    ""
                                ));

                            const colorMatches =
                                !recordColor ||
                                recordColor ===
                                norm(
                                    color
                                );

                            const barcodeMatches =
                                !recordBarcode ||
                                !allowedBarcodes.size ||
                                allowedBarcodes.has(
                                    recordBarcode
                                );

                            return (
                                colorMatches &&
                                barcodeMatches
                            );
                        }
                    );

                pair =
                    chooseImagePair(
                        rowRecords
                    );
            }

            const front =
                pair.front
                    ?.image_url ||
                clean(first(
                    representative.front_image_url,
                    representative.frontImageUrl,
                    representative.main_image_url,
                    representative.mainImageUrl,
                    representative.image_url,
                    representative.imageUrl,
                    FALLBACK_IMAGE
                ));

            const back =
                pair.back
                    ?.image_url ||
                clean(first(
                    representative.back_image_url,
                    representative.backImageUrl,
                    ""
                ));

            const images =
                mergeImageRecords(
                    pair.records,
                    preferredRecords
                ).filter(
                    (
                        record
                    ) =>
                        validImage(
                            record.image_url
                        )
                );

            const sizes =
                uniqueText(
                    colorVariants.map(
                        (
                            variant
                        ) =>
                            variant.size
                    )
                ).sort(
                    (
                        a,
                        b
                    ) =>
                        a.localeCompare(
                            b,
                            undefined,
                            {
                                numeric:
                                    true,
                            }
                        )
                );

            const barcodes =
                uniqueText(
                    colorVariants.flatMap(
                        (
                            variant
                        ) => [
                            variant.barcode,
                            variant.ean_code,
                            variant.eanCode,
                        ]
                    )
                );

            const availableQty =
                colorVariants.reduce(
                    (
                        sum,
                        variant
                    ) =>
                        sum +
                        numeric(first(
                            variant.available_qty,
                            variant.availableQty,
                            0
                        )),
                    0
                );

            const onHand =
                colorVariants.reduce(
                    (
                        sum,
                        variant
                    ) =>
                        sum +
                        numeric(first(
                            variant.on_hand,
                            variant.onHand,
                            0
                        )),
                    0
                );

            const reserved =
                colorVariants.reduce(
                    (
                        sum,
                        variant
                    ) =>
                        sum +
                        numeric(first(
                            variant.reserved,
                            variant.reserved_qty,
                            variant.reservedQty,
                            0
                        )),
                    0
                );

            const variantId =
                first(
                    representative.variant_id,
                    representative.variantId,
                    representative.id,
                    ""
                );

            const barcode =
                clean(first(
                    representative.barcode,
                    representative.ean_code,
                    representative.eanCode,
                    barcodes[0],
                    ""
                ));

            const colorValue =
                clean(first(
                    representative.colorHex,
                    representative.colourHex,
                    representative.color_hex,
                    representative.colour_hex,
                    representative.swatchColor,
                    representative.swatch_color,
                    resolveColorHex(
                        color,
                        ""
                    ),
                    ""
                ));

            return {
                color,
                colour: color,
                image:
                    front ||
                    FALLBACK_IMAGE,
                imageUrl:
                    front ||
                    FALLBACK_IMAGE,
                image_url:
                    front ||
                    FALLBACK_IMAGE,
                frontImageUrl:
                    front ||
                    FALLBACK_IMAGE,
                front_image_url:
                    front ||
                    FALLBACK_IMAGE,
                backImageUrl:
                    back,
                back_image_url:
                    back,
                colorValue,
                colourValue:
                    colorValue,
                available:
                    availableQty >
                    0,
                inStock:
                    availableQty >
                    0,
                in_stock:
                    availableQty >
                    0,
                availableQty,
                available_qty:
                    availableQty,
                onHand,
                on_hand:
                    onHand,
                reserved,
                sizes,
                barcodes,
                variantId,
                variant_id:
                    variantId,
                barcode,
                eanCode:
                    barcode,
                ean_code:
                    barcode,
                images:
                    images.length
                        ? images
                        : [
                            {
                                image_url:
                                    front ||
                                    FALLBACK_IMAGE,
                                imageUrl:
                                    front ||
                                    FALLBACK_IMAGE,
                                image_type:
                                    "front",
                                imageType:
                                    "front",
                                colour:
                                    color,
                                color,
                            },
                        ],
            };
        }
    );
};

const normalizeProduct = (
    row: Row,
): Product | null => {
    const variants =
        rawVariants(row)
            .map((variant) =>
                normalizeVariant(
                    variant,
                    row
                )
            )
            .filter(
                (variant) =>
                    variant.product_id ||
                    variant.variant_id ||
                    variant.barcode ||
                    variant.size ||
                    variant.colour
            );

    if (!variants.length) {
        return null;
    }

    const stocked =
        variants.filter(
            (variant) =>
                variant.available_qty >
                0
        );

    const usable =
        stocked.length
            ? stocked
            : variants;

    const selected =
        [...usable].sort(
            (
                firstVariant,
                secondVariant
            ) => {
                const firstPrice =
                    firstVariant.sale_price >
                    0
                        ? firstVariant.sale_price
                        : Number.MAX_SAFE_INTEGER;

                const secondPrice =
                    secondVariant.sale_price >
                    0
                        ? secondVariant.sale_price
                        : Number.MAX_SAFE_INTEGER;

                return (
                    firstPrice -
                    secondPrice ||
                    secondVariant.available_qty -
                    firstVariant.available_qty
                );
            }
        )[0];

    const source =
        selected.raw ||
        row;

    const productId = first(
        selected.product_id,
        selected.productId,
        source.product_id,
        source.productId,
        source.id,
        row.product_id,
        row.productId,
        row.id,
        ""
    );

    const productName =
        clean(first(
            source.product_name,
            source.productName,
            source.name,
            source.title,
            row.product_name,
            row.productName,
            row.name,
            row.title,
            "Product"
        ));

    const brand =
        clean(first(
            source.brand_name,
            source.brandName,
            source.brand,
            row.brand_name,
            row.brandName,
            row.brand,
            "Vandhana"
        ));

    const gender =
        toGender(first(
            source.gender,
            source.category,
            row.gender,
            row.category,
            ""
        ));

    const sizes =
        uniqueText(
            variants.map(
                (
                    variant
                ) =>
                    variant.size
            )
        ).sort(
            (
                firstSize,
                secondSize
            ) =>
                firstSize.localeCompare(
                    secondSize,
                    undefined,
                    {
                        numeric:
                            true,
                    }
                )
        );

    const colorOptions =
        buildColorOptions(
            variants,
            row
        );

    const colors =
        colorOptions.length
            ? colorOptions.map(
                (
                    option
                ) =>
                    option.color
            )
            : uniqueText(
                variants.map(
                    (
                        variant
                    ) =>
                        variant.colour
                )
            );

    const totals =
        variants.reduce(
            (
                result,
                variant
            ) => ({
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
            }
        );

    const selectedColorVariants =
        variants.filter(
            (
                variant
            ) =>
                (
                    !selected.product_id ||
                    String(
                        variant.product_id
                    ) ===
                    String(
                        selected.product_id
                    )
                ) &&
                (
                    !selected.colour ||
                    norm(
                        variant.colour
                    ) ===
                    norm(
                        selected.colour
                    )
                )
        );

    const records =
        mergeImageRecords(
            selected.images,
            ...selectedColorVariants.map(
                (
                    variant
                ) =>
                    variant.images
            ),
            collectImageRecords(
                source
            ),
            collectImageRecords(
                row
            )
        );

    const allowedBarcodes =
        new Set(
            selectedColorVariants
                .flatMap(
                    (
                        variant
                    ) => [
                        variant.barcode,
                        variant.ean_code,
                        variant.eanCode,
                    ]
                )
                .map(clean)
                .filter(Boolean)
        );

    const selectedRecords =
        records.filter(
            (record) => {
                const recordColor =
                    norm(
                        record.colour ||
                        record.color
                    );

                const colorMatches =
                    !recordColor ||
                    !selected.colour ||
                    recordColor ===
                    norm(
                        selected.colour
                    );

                const recordBarcode =
                    clean(
                        record.barcode ||
                        record.ean_code ||
                        record.eanCode
                    );

                const barcodeMatches =
                    !recordBarcode ||
                    !allowedBarcodes.size ||
                    allowedBarcodes.has(
                        recordBarcode
                    );

                return (
                    colorMatches &&
                    barcodeMatches
                );
            }
        );

    const pair =
        chooseImagePair(
            selectedRecords.length
                ? selectedRecords
                : records
        );

    const front =
        pair.front
            ?.image_url ||
        FALLBACK_IMAGE;

    const back =
        pair.back
            ?.image_url ||
        "";

    const displayRecords = [
        pair.front,
        pair.back,
    ].filter(
        Boolean
    ) as ImageRecord[];

    const mrp =
        selected.mrp ||
        0;

    const price =
        selected.sale_price ||
        mrp;

    const discount =
        selected.b2c_discount_pct ||
        0;

    const stockBySize =
        variants.reduce(
            (
                result:
                    Record<
                        string,
                        number
                    >,
                variant
            ) => {
                if (
                    variant.size
                ) {
                    result[
                        variant.size
                    ] =
                        (
                            result[
                                variant.size
                            ] ||
                            0
                        ) +
                        variant.available_qty;
                }

                return result;
            },
            {}
        );

    const categoryId =
        clean(first(
            selected.category_id,
            source.category_id,
            source.categoryId,
            row.category_id,
            row.categoryId,
            ""
        ));

    const categoryName =
        clean(first(
            selected.category_name,
            source.category_name,
            source.categoryName,
            row.category_name,
            row.categoryName,
            ""
        ));

    const categorySlug =
        clean(first(
            selected.category_slug,
            source.category_slug,
            source.categorySlug,
            row.category_slug,
            row.categorySlug,
            ""
        ));

    const parentCategoryId =
        clean(first(
            selected.parent_category_id,
            source.parent_category_id,
            source.parentCategoryId,
            row.parent_category_id,
            row.parentCategoryId,
            ""
        ));

    const parentCategoryName =
        clean(first(
            selected.parent_category_name,
            source.parent_category_name,
            source.parentCategoryName,
            row.parent_category_name,
            row.parentCategoryName,
            ""
        ));

    const categoryPath =
        clean(first(
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
            ""
        ));

    const designCode =
        getDesignCode(
            selected,
            source
        ) ||
        getDesignCode(
            row,
            row
        );

    const routeKey =
        getStorefrontGroupKey(
            row
        ) ||
        clean(
            row.route_key ||
            row.routeKey ||
            row.design_key ||
            row.designKey ||
            designCode ||
            designKey(
                row
            )
        );

    const patternType =
        getPatternType(
            selected,
            source
        ) ||
        getPatternType(
            row,
            row
        );

    const patternCode =
        clean(first(
            selected.pattern_code,
            source.pattern_code,
            source.patternCode,
            row.pattern_code,
            row.patternCode,
            ""
        ));

    const imageCode =
        clean(first(
            selected.image_code,
            source.image_code,
            source.imageCode,
            row.image_code,
            row.imageCode,
            ""
        ));

    const barcodes =
        uniqueText(
            variants.flatMap(
                (
                    variant
                ) => [
                    variant.barcode,
                    variant.ean_code,
                    variant.eanCode,
                ]
            )
        );

    const selectedPhysical =
        physicalMetadata(
            selected,
            source
        );

    const originalB2B =
        numeric(first(
            selected.original_price_b2b,
            selected.originalPriceB2b,
            selected.cost_price,
            mrp
        ), mrp);

    const finalB2B =
        numeric(first(
            selected.final_price_b2b,
            selected.finalPriceB2b,
            selected.b2b_final_price,
            originalB2B
        ), originalB2B);

    const b2bDiscount =
        percentage(first(
            selected.b2b_discount_pct,
            selected.b2bDiscountPct,
            selected.discount_b2b,
            0
        ));

    return {
        id:
            routeKey ||
            clean(first(
                productId,
                selected.variant_id,
                selected.barcode,
                ""
            )),
        productId,
        product_id:
            productId,
        variantId:
            selected.variant_id,
        variant_id:
            selected.variant_id,
        primaryVariantId:
            selected.variant_id,
        primary_variant_id:
            selected.variant_id,
        designCode:
            routeKey ||
            designCode,
        design_code:
            designCode,
        sourceDesignCode:
            designCode,
        source_design_code:
            designCode,
        storefrontGroupKey:
            routeKey,
        storefront_group_key:
            routeKey,
        groupKey:
            routeKey,
        group_key:
            routeKey,
        designKey:
            routeKey,
        design_key:
            routeKey,
        routeKey,
        route_key:
            routeKey,
        patternType,
        pattern_type:
            patternType,
        patternCode,
        pattern_code:
            patternCode,
        imageCode,
        image_code:
            imageCode,
        title:
            productName,
        product_name:
            productName,
        name:
            productName,
        description:
            clean(first(
                source.description,
                row.description,
                `${brand} ${productName}`
            )),
        brand,
        brand_name:
            brand,
        gender,
        category:
            gender,
        categoryId,
        category_id:
            categoryId,
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
        salePrice:
            price,
        sale_price:
            price,
        selling_price:
            price,
        final_price_b2c:
            price,
        discounted_price:
            price,
        mahaveer_price:
            price,
        originalPrice:
            mrp,
        original_price_b2c:
            mrp,
        originalPriceB2b:
            originalB2B,
        original_price_b2b:
            originalB2B,
        finalPriceB2b:
            finalB2B,
        final_price_b2b:
            finalB2B,
        b2b_final_price:
            finalB2B,
        cost_price:
            originalB2B,
        b2b_discount_pct:
            b2bDiscount,
        discount_b2b:
            b2bDiscount,
        mrp,
        isSale:
            mrp >
            price,
        discount,
        discount_b2c:
            discount,
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
                        image_url:
                            front,
                        imageUrl:
                            front,
                        image_type:
                            "front",
                        imageType:
                            "front",
                    },
                ],
        frontImageUrl:
            front,
        front_image_url:
            front,
        backImageUrl:
            back,
        back_image_url:
            back,
        mainImageUrl:
            front,
        main_image_url:
            front,
        imageUrl:
            front,
        image_url:
            front,
        barcode:
            selected.barcode ||
            "",
        ean_code:
            selected.ean_code ||
            selected.barcode ||
            "",
        eanCode:
            selected.eanCode ||
            selected.barcode ||
            "",
        barcodes,
        ean_codes:
            barcodes,
        eanCodes:
            barcodes,
        size:
            selected.size ||
            sizes[0] ||
            "",
        colour:
            selected.colour ||
            "",
        color:
            selected.colour ||
            "",
        selectedColor:
            selected.colour ||
            "",
        selected_color:
            selected.colour ||
            "",
        selectedColour:
            selected.colour ||
            "",
        selected_colour:
            selected.colour ||
            "",
        sizes,
        allSizes:
            sizes,
        all_sizes:
            sizes,
        colors,
        colours:
            colors,
        colorOptions,
        colourOptions:
            colorOptions,
        color_options:
            colorOptions,
        colour_options:
            colorOptions,
        stockBySize,
        specs: {
            material:
                clean(first(
                    source.material,
                    row.material,
                    ""
                )),
            fit:
                clean(first(
                    source.fit,
                    source.fit_type,
                    row.fit,
                    row.fit_type,
                    ""
                )),
            washCare: [],
        },
        ratings: {
            average:
                numeric(first(
                    source.rating_average,
                    source.rating,
                    row.rating_average,
                    row.rating,
                    4.5
                ), 4.5),
            count:
                numeric(first(
                    source.rating_count,
                    source.reviews,
                    row.rating_count,
                    row.reviews,
                    0
                )),
        },
        createdAt:
            clean(first(
                source.created_at,
                source.createdAt,
                row.created_at,
                row.createdAt,
                new Date()
                    .toISOString()
            )),
        created_at:
            clean(first(
                source.created_at,
                source.createdAt,
                row.created_at,
                row.createdAt,
                new Date()
                    .toISOString()
            )),
        onHand:
            totals.onHand,
        on_hand:
            totals.onHand,
        reserved:
            totals.reserved,
        reserved_qty:
            totals.reserved,
        reservedQty:
            totals.reserved,
        available_qty:
            totals.available,
        availableQty:
            totals.available,
        in_stock:
            totals.available >
            0,
        inStock:
            totals.available >
            0,
        weight:
            selectedPhysical.weight,
        weight_kg:
            selectedPhysical.weight,
        weightKg:
            selectedPhysical.weight,
        length:
            selectedPhysical.length,
        width:
            selectedPhysical.width,
        height:
            selectedPhysical.height,
        hsn_code:
            selectedPhysical.hsnCode,
        hsnCode:
            selectedPhysical.hsnCode,
        hsn_percentage:
            selectedPhysical.hsnPercentage,
        hsnPercentage:
            selectedPhysical.hsnPercentage,
        fit_type:
            selectedPhysical.fitType,
        fitType:
            selectedPhysical.fitType,
        mark_code:
            selectedPhysical.markCode,
        markCode:
            selectedPhysical.markCode,
        variants,
        colorVariants:
            variants,
        color_variants:
            variants,
        variantCount:
            variants.length,
        variant_count:
            variants.length,
        colorVariantCount:
            variants.length,
        color_variant_count:
            variants.length,
        raw:
            row,
    } as unknown as Product;
};

const categoryImage = (
    category: Row,
) => {
    if (
        validImage(
            category.image
        )
    ) {
        return clean(
            category.image
        );
    }

    return (
        fallbackCategories.find(
            (item) =>
                String(item.id) ===
                String(
                    category.id
                )
        )?.image ||
        FALLBACK_IMAGE
    );
};

const categoryNode = (
    node: Row,
    parentId:
        string | null = null,
): StorefrontCategory => {
    const id =
        String(
            node.id ||
            ""
        );

    return {
        id,
        name:
            clean(
                node.name
            ),
        slug:
            clean(
                node.slug
            ),
        image:
            categoryImage(
                node
            ),
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
                node.level ||
                0
            ),
        gender:
            node.gender,
        categoryPath:
            clean(
                node.categoryPath ||
                node.category_path ||
                node.name
            ),
        category_path:
            clean(
                node.category_path ||
                node.categoryPath ||
                node.name
            ),
        is_active:
            node.is_active !==
            false,
        selectable:
            node.selectable !==
            false &&
            node.is_active !==
            false,
        sort_order:
            Number(
                node.sort_order ||
                0
            ),
        children:
            Array.isArray(
                node.children
            )
                ? node.children.map(
                    (
                        child:
                            Row
                    ) =>
                        categoryNode(
                            child,
                            id
                        )
                )
                : [],
    };
};

const flatTree = (
    items:
        StorefrontCategory[],
) => {
    const map =
        new Map(
            items.map(
                (
                    item
                ) => [
                    String(
                        item.id
                    ),
                    {
                        ...item,
                        children: [],
                    } as StorefrontCategory,
                ]
            )
        );

    const roots:
        StorefrontCategory[] =
        [];

    map.forEach(
        (item) => {
            const parent =
                item.parentId ||
                item.parent_id;

            if (
                parent &&
                map.has(
                    String(
                        parent
                    )
                )
            ) {
                map
                    .get(
                        String(
                            parent
                        )
                    )!
                    .children!
                    .push(
                        item
                    );
            } else {
                roots.push(
                    item
                );
            }
        }
    );

    return roots;
};

const fetchJson = async (
    url: string,
) => {
    const response =
        await fetch(
            url,
            {
                method:
                    "GET",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                cache:
                    "no-store",
            }
        );

    const data =
        await response
            .json()
            .catch(
                () => []
            );

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
};

const rowsFrom = (
    data: any,
) => {
    if (
        Array.isArray(
            data
        )
    ) {
        return data;
    }

    if (
        Array.isArray(
            data?.data
        )
    ) {
        return data.data;
    }

    if (
        Array.isArray(
            data?.products
        )
    ) {
        return data.products;
    }

    if (
        Array.isArray(
            data?.rows
        )
    ) {
        return data.rows;
    }

    if (
        Array.isArray(
            data?.items
        )
    ) {
        return data.items;
    }

    return [];
};

export const flattenCategoryTree = (
    tree:
        StorefrontCategory[],
) => {
    const result:
        StorefrontCategory[] =
        [];

    const walk = (
        items:
            StorefrontCategory[],
    ) =>
        items.forEach(
            (item) => {
                result.push(
                    item
                );

                if (
                    item.children
                        ?.length
                ) {
                    walk(
                        item.children
                    );
                }
            }
        );

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
                ? toBackendGender(
                    gender
                )
                : "";

        try {
            const data =
                await fetchJson(
                    backendGender
                        ? `${API_BASE}/api/categories/tree?gender=${encodeURIComponent(backendGender)}&_ts=${Date.now()}`
                        : `${API_BASE}/api/categories/tree?_ts=${Date.now()}`
                );

            return Array.isArray(
                data
            )
                ? data.map(
                    (
                        node:
                            Row
                    ) =>
                        categoryNode(
                            node
                        )
                )
                : [];
        } catch {
            const flat =
                fallbackCategories
                    .filter(
                        (
                            item
                        ) =>
                            item.is_active !==
                            false
                    )
                    .map(
                        (
                            item
                        ) =>
                            categoryNode(
                                item
                            )
                    );

            return flatTree(
                backendGender
                    ? flat.filter(
                        (
                            item
                        ) =>
                            item.gender ===
                            backendGender
                    )
                    : flat
            );
        }
    };

export const fetchCategoriesByGender =
    async (
        gender:
            ProductGender,
    ) =>
        flattenCategoryTree(
            await fetchCategoriesTree(
                gender
            )
        ).filter(
            (item) =>
                item.level >
                0 &&
                item.is_active !==
                false
        );

const fetchRows = async (
    branchId: number,
    options:
        ProductFetchOptions = {},
) => {
    const params =
        new URLSearchParams();

    if (
        options.gender
    ) {
        params.set(
            "gender",
            toBackendGender(
                options.gender
            )
        );
    }

    if (
        clean(
            options.categoryId
        )
    ) {
        params.set(
            "category_id",
            clean(
                options.categoryId
            )
        );
    }

    params.set(
        "all",
        "true"
    );

    params.set(
        "_ts",
        String(
            Date.now()
        )
    );

    params.set(
        "group_by",
        "color"
    );

    try {
        return rowsFrom(
            await fetchJson(
                `${API_BASE}/api/branch/${encodeURIComponent(branchId)}/stock?${params.toString()}`
            )
        );
    } catch {
        return rowsFrom(
            await fetchJson(
                `${API_BASE}/api/products?branch_id=${encodeURIComponent(branchId)}&all=true&group_by=color&_ts=${Date.now()}`
            )
        );
    }
};

const productKey = (
    product: Row,
) => {
    const storefrontKey =
        clean(first(
            product.storefrontGroupKey,
            product.storefront_group_key,
            product.groupKey,
            product.group_key,
            product.routeKey,
            product.route_key,
            product.designKey,
            product.design_key,
            ""
        )).toUpperCase();

    if (
        storefrontKey
    ) {
        return storefrontKey;
    }

    const explicitDesignCode =
        clean(first(
            product.designCode,
            product.design_code,
            ""
        )).toUpperCase();

    if (
        explicitDesignCode
    ) {
        return explicitDesignCode;
    }

    const productId =
        clean(first(
            product.productId,
            product.product_id,
            ""
        ));

    if (
        productId
    ) {
        return `PRODUCT-${productId}`;
    }

    const variantId =
        clean(first(
            product.variantId,
            product.variant_id,
            product.primaryVariantId,
            product.primary_variant_id,
            ""
        ));

    if (
        variantId
    ) {
        return `VARIANT-${variantId}`;
    }

    return clean(first(
        product.routeKey,
        product.route_key,
        product.designKey,
        product.design_key,
        product.id,
        ""
    ));
};

export const productMatchesCategoryId =
    (
        product: Row,
        categoryId:
            | string
            | number,
    ) =>
        !clean(
            categoryId
        ) ||
        clean(first(
            product.categoryId,
            product.category_id,
            ""
        )) ===
        clean(
            categoryId
        );

export const productMatchesCategorySlug =
    (
        product: Row,
        slug: string,
    ) =>
        !norm(slug) ||
        norm(first(
            product.categorySlug,
            product.category_slug,
            ""
        )) ===
        norm(slug);

export const fetchBranchProducts =
    async (
        branchId =
            DEFAULT_BRANCH_ID,
        options:
            ProductFetchOptions = {},
    ): Promise<
        Product[]
    > => {
        let products =
            mergeRows(
                await fetchRows(
                    branchId,
                    options
                )
            )
                .map(
                    normalizeProduct
                )
                .filter(
                    Boolean
                ) as Product[];

        if (
            options.gender
        ) {
            const gender =
                toGender(
                    options.gender
                ).toLowerCase();

            products =
                products.filter(
                    (
                        product
                    ) =>
                        String(
                            (
                                product as any
                            ).gender ||
                            ""
                        ).toLowerCase() ===
                        gender
                );
        }

        return Array.from(
            new Map(
                products.map(
                    (
                        product
                    ) => [
                        productKey(
                            product
                        ),
                        product,
                    ]
                )
            ).values()
        );
    };

export const fetchProductsByGender =
    (
        gender:
            ProductGender,
        branchId =
            DEFAULT_BRANCH_ID,
    ) =>
        fetchBranchProducts(
            branchId,
            {
                gender,
            }
        );

const descendantCategoryIds = (
    tree:
        StorefrontCategory[],
    categoryId:
        | string
        | number,
) => {
    const target =
        clean(
            categoryId
        );

    const flat =
        flattenCategoryTree(
            tree
        );

    const ids =
        new Set<string>(
            target
                ? [
                    target,
                ]
                : []
        );

    let changed =
        true;

    while (
        changed
    ) {
        changed =
            false;

        flat.forEach(
            (
                category
            ) => {
                const id =
                    clean(
                        category.id
                    );

                const parent =
                    clean(
                        category.parentId ||
                        category.parent_id
                    );

                if (
                    id &&
                    parent &&
                    ids.has(
                        parent
                    ) &&
                    !ids.has(
                        id
                    )
                ) {
                    ids.add(
                        id
                    );

                    changed =
                        true;
                }
            }
        );
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
        const [
            products,
            tree,
        ] =
            await Promise.all(
                [
                    fetchBranchProducts(
                        branchId,
                        {
                            categoryId,
                        }
                    ),
                    fetchCategoriesTree(),
                ]
            );

        const allowed =
            descendantCategoryIds(
                tree,
                categoryId
            );

        return products.filter(
            (
                product:
                    any
            ) =>
                allowed.has(
                    clean(first(
                        product.categoryId,
                        product.category_id,
                        ""
                    ))
                )
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
                branchId
            )
        ).filter(
            (
                product
            ) =>
                productMatchesCategorySlug(
                    product,
                    slug
                )
        );

const variantsOf = (
    product: Row,
) =>
    Array.isArray(
        product.variants
    )
        ? product.variants
        : [];

const topMatch = (
    product: Row,
    target: string,
    fields: string[],
) =>
    fields.some(
        (
            field
        ) =>
            clean(
                product[field]
            ) ===
            target
    );

const variantMatch = (
    product: Row,
    target: string,
    fields: string[],
) =>
    variantsOf(
        product
    ).some(
        (
            variant:
                Row
        ) =>
            fields.some(
                (
                    field
                ) =>
                    clean(
                        variant[
                            field
                        ]
                    ) ===
                    target
            )
    );

export const fetchProductById = async (
    id: string | number,
    branchId = DEFAULT_BRANCH_ID
): Promise<Product | null> => {
    const products = await fetchBranchProducts(branchId);
    const target = clean(id);

    if (!target) {
        return null;
    }

    const matched =
        products.find(
            (product) =>
                topMatch(
                    product,
                    target,
                    [
                        "designCode",
                        "design_code",
                        "groupKey",
                        "group_key",
                        "routeKey",
                        "route_key",
                        "designKey",
                        "design_key",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                topMatch(
                    product,
                    target,
                    [
                        "product_id",
                        "productId",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                variantMatch(
                    product,
                    target,
                    [
                        "product_id",
                        "productId",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                topMatch(
                    product,
                    target,
                    [
                        "variant_id",
                        "variantId",
                        "primary_variant_id",
                        "primaryVariantId",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                variantMatch(
                    product,
                    target,
                    [
                        "variant_id",
                        "variantId",
                        "id",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                topMatch(
                    product,
                    target,
                    [
                        "barcode",
                        "ean_code",
                        "eanCode",
                    ]
                )
        ) ||
        products.find(
            (product) =>
                variantMatch(
                    product,
                    target,
                    [
                        "barcode",
                        "ean_code",
                        "eanCode",
                    ]
                )
        ) ||
        null;

    if (!matched) {
        return null;
    }

    const matchedRow =
        matched as unknown as Row;

    const matchedProductId =
        clean(first(
            matchedRow.productId,
            matchedRow.product_id,
            ""
        ));

    const matchedDesignCode =
        clean(first(
            matchedRow.sourceDesignCode,
            matchedRow.source_design_code,
            matchedRow.design_code,
            matchedRow.designCode,
            ""
        )).toUpperCase();

    const siblings =
        products.filter(
            (
                product
            ) => {
                const row =
                    product as unknown as Row;

                const productId =
                    clean(first(
                        row.productId,
                        row.product_id,
                        ""
                    ));

                const designCode =
                    clean(first(
                        row.sourceDesignCode,
                        row.source_design_code,
                        row.design_code,
                        row.designCode,
                        ""
                    )).toUpperCase();

                if (
                    matchedProductId &&
                    productId &&
                    matchedProductId ===
                    productId
                ) {
                    return true;
                }

                if (
                    matchedDesignCode &&
                    designCode &&
                    matchedDesignCode ===
                    designCode
                ) {
                    return true;
                }

                return false;
            }
        );

    if (
        siblings.length <=
        1
    ) {
        return matched;
    }

    const variantMap =
        new Map<
            string,
            Row
        >();

    siblings.forEach(
        (
            product
        ) => {
            const row =
                product as unknown as Row;

            const rows =
                Array.isArray(
                    row.variants
                ) &&
                row.variants.length
                    ? row.variants
                    : [
                        row,
                    ];

            rows.forEach(
                (
                    variant:
                        Row
                ) => {
                    const key =
                        variantKey(
                            variant
                        );

                    variantMap.set(
                        key,
                        mergeVariantRows(
                            variantMap.get(
                                key
                            ),
                            variant
                        )
                    );
                }
            );
        }
    );

    const mergedVariants =
        Array.from(
            variantMap.values()
        );

    const colorOptions =
        buildColorOptions(
            mergedVariants,
            matchedRow
        );

    const colors =
        colorOptions.length
            ? colorOptions.map(
                (
                    option
                ) =>
                    option.color
            )
            : uniqueText(
                mergedVariants.map(
                    (
                        variant
                    ) =>
                        first(
                            variant.colour,
                            variant.color,
                            ""
                        )
                )
            );

    const sizes =
        uniqueText(
            mergedVariants.map(
                (
                    variant
                ) =>
                    first(
                        variant.size,
                        variant.selected_size,
                        variant.selectedSize,
                        ""
                    )
            )
        ).sort(
            (
                firstSize,
                secondSize
            ) =>
                firstSize.localeCompare(
                    secondSize,
                    undefined,
                    {
                        numeric:
                            true,
                    }
                )
        );

    const barcodes =
        uniqueText(
            mergedVariants.flatMap(
                (
                    variant
                ) => [
                    variant.barcode,
                    variant.ean_code,
                    variant.eanCode,
                ]
            )
        );

    const totals =
        mergedVariants.reduce(
            (
                result,
                variant
            ) => {
                const stock =
                    stockOf(
                        variant
                    );

                return {
                    onHand:
                        result.onHand +
                        stock.onHand,
                    reserved:
                        result.reserved +
                        stock.reserved,
                    available:
                        result.available +
                        stock.available,
                };
            },
            {
                onHand: 0,
                reserved: 0,
                available: 0,
            }
        );

    const stockBySize =
        mergedVariants.reduce(
            (
                result:
                    Record<
                        string,
                        number
                    >,
                variant
            ) => {
                const size =
                    clean(first(
                        variant.size,
                        variant.selected_size,
                        variant.selectedSize,
                        ""
                    ));

                if (!size) {
                    return result;
                }

                result[
                    size
                ] =
                    (
                        result[
                            size
                        ] ||
                        0
                    ) +
                    stockOf(
                        variant
                    ).available;

                return result;
            },
            {}
        );

    return {
        ...matchedRow,
        variants:
            mergedVariants,
        colorVariants:
            mergedVariants,
        color_variants:
            mergedVariants,
        variantCount:
            mergedVariants.length,
        variant_count:
            mergedVariants.length,
        colorVariantCount:
            mergedVariants.length,
        color_variant_count:
            mergedVariants.length,
        colors,
        colours:
            colors,
        sizes,
        allSizes:
            sizes,
        all_sizes:
            sizes,
        colorOptions,
        colourOptions:
            colorOptions,
        color_options:
            colorOptions,
        colour_options:
            colorOptions,
        barcodes,
        ean_codes:
            barcodes,
        eanCodes:
            barcodes,
        stockBySize,
        onHand:
            totals.onHand,
        on_hand:
            totals.onHand,
        reserved:
            totals.reserved,
        reserved_qty:
            totals.reserved,
        reservedQty:
            totals.reserved,
        available_qty:
            totals.available,
        availableQty:
            totals.available,
        in_stock:
            totals.available >
            0,
        inStock:
            totals.available >
            0,
    } as unknown as Product;
};