import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
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
const PLACEHOLDER = "/placeholder.svg";
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL"];

type StoredUser = {
    id?: number;
    name?: string;
    email?: string;
    mobile?: string;
    type?: string;
    userType?: string;
    user_type?: string;
    customer_type?: string;
    role?: string;
};

type StockSource = {
    variantId: number;
    available: number;
};

type Variant = {
    id: string | number;
    variantId: string | number;
    productId: string | number;
    designCode: string;
    patternType: string;
    patternCode: string;
    size: string;
    color: string;
    barcode: string;
    mrp: number;
    salePrice: number;
    originalPriceB2B: number;
    finalPriceB2B: number;
    available: number;
    imageUrl: string;
    backImageUrl: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    hsnCode: string;
    hsnPercentage: number | null;
    stockSources: StockSource[];
    raw: any;
};

type ColorOption = {
    color: string;
    image: string;
    backImage: string;
    available: boolean;
};

const text = (value: any) => String(value ?? "").trim();

const num = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const positiveId = (value: any) => {
    const parsed = Number(text(value));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeSize = (value: any) =>
    text(value)
        .toUpperCase()
        .replace(/\s+/g, "");

const sameSize = (a: any, b: any) =>
    normalizeSize(a) === normalizeSize(b);

const normalizeColor = (value: any) =>
    text(value)
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const sameColor = (a: any, b: any) =>
    normalizeColor(a) === normalizeColor(b);

const uniqueStrings = (values: any[]) =>
    Array.from(
        new Map(
            values
                .map(text)
                .filter(Boolean)
                .map((value) => [value.toLowerCase(), value]),
        ).values(),
    );

const uniqueImages = (values: any[]) =>
    Array.from(
        new Set(
            values
                .flatMap((value) => (Array.isArray(value) ? value : [value]))
                .map((value: any) =>
                    typeof value === "string"
                        ? value.trim()
                        : text(
                              value?.image_url ||
                                  value?.imageUrl ||
                                  value?.url ||
                                  value?.secure_url,
                          ),
                )
                .filter(
                    (value) =>
                        value &&
                        value !== "[object Object]" &&
                        !value.includes("undefined") &&
                        !value.includes("null"),
                ),
        ),
    );

const sortSizes = (values: string[]) =>
    uniqueStrings(values).sort((a, b) => {
        const na = normalizeSize(a);
        const nb = normalizeSize(b);
        const ia = SIZE_ORDER.indexOf(na);
        const ib = SIZE_ORDER.indexOf(nb);

        if (ia !== -1 && ib !== -1) {
            return ia - ib;
        }

        if (ia !== -1) {
            return -1;
        }

        if (ib !== -1) {
            return 1;
        }

        const aa = Number(na);
        const bb = Number(nb);

        if (Number.isFinite(aa) && Number.isFinite(bb)) {
            return aa - bb;
        }

        return na.localeCompare(nb, undefined, {
            numeric: true,
        });
    });

const sortColors = (values: string[]) =>
    Array.from(
        new Map(
            values
                .map(text)
                .filter(Boolean)
                .map((value) => [normalizeColor(value), value]),
        ).values(),
    ).sort((a, b) =>
        normalizeColor(a).localeCompare(normalizeColor(b)),
    );

const firstDiscount = (...values: any[]) => {
    for (const value of values) {
        const discount = Math.min(
            100,
            Math.max(0, num(value)),
        );

        if (discount > 0) {
            return discount;
        }
    }

    return 0;
};

const discountedPrice = (
    price: number,
    discount: number,
) =>
    Math.round(
        (
            price -
            (price * discount) / 100 +
            Number.EPSILON
        ) *
            100,
    ) / 100;

const parseArray = (value: any): any[] => {
    if (Array.isArray(value)) {
        return value;
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        return [];
    }
};

const getStoredUser = (): StoredUser | null => {
    const raw =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user");

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const isBusinessUser = (
    user: StoredUser | null,
) => {
    const type = normalizeColor(
        user?.userType ||
            user?.user_type ||
            user?.customer_type ||
            user?.type ||
            user?.role,
    );

    return (
        type === "b2b" ||
        type.includes("business")
    );
};

const wishlistKey = (userId: number) =>
    `wishlist_variant_ids_${userId}`;

const legacyWishlistKey = (userId: number) =>
    `wishlist_product_ids_${userId}`;

const readWishlist = (userId: number) => {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(wishlistKey(userId)) ||
                localStorage.getItem(legacyWishlistKey(userId)) ||
                "[]",
        );

        return Array.isArray(parsed)
            ? parsed
                  .map(Number)
                  .filter(
                      (id) =>
                          Number.isInteger(id) &&
                          id > 0,
                  )
            : [];
    } catch {
        return [];
    }
};

const writeWishlist = (
    userId: number,
    ids: number[],
) => {
    const value = Array.from(
        new Set(
            ids.filter(
                (id) =>
                    Number.isInteger(id) &&
                    id > 0,
            ),
        ),
    );

    localStorage.setItem(
        wishlistKey(userId),
        JSON.stringify(value),
    );

    localStorage.setItem(
        legacyWishlistKey(userId),
        JSON.stringify(value),
    );

    window.dispatchEvent(
        new Event("wishlist-updated"),
    );
};

const imageListFromSource = (
    source: any,
) => {
    if (!source) {
        return [];
    }

    return uniqueImages([
        source?.front_image_url,
        source?.frontImageUrl,
        source?.main_image_url,
        source?.mainImageUrl,
        source?.image_url,
        source?.imageUrl,
        source?.back_image_url,
        source?.backImageUrl,
        ...parseArray(source?.images),
        ...parseArray(source?.product_images),
        ...parseArray(source?.productImages),
        ...parseArray(source?.variant_images),
        ...parseArray(source?.variantImages),
    ]);
};

const explicitFrontImageFromSource = (
    source: any,
) => {
    if (!source) {
        return "";
    }

    const structuredImages = [
        ...parseArray(source?.images),
        ...parseArray(source?.product_images),
        ...parseArray(source?.productImages),
        ...parseArray(source?.variant_images),
        ...parseArray(source?.variantImages),
    ];

    const typedFront = structuredImages.find(
        (item: any) => {
            const type = normalizeColor(
                item?.image_type ||
                    item?.imageType ||
                    item?.type ||
                    item?.view ||
                    item?.position,
            );

            return (
                type.includes("front") ||
                type.includes("main") ||
                type.includes("primary") ||
                type.includes("default")
            );
        },
    );

    return (
        uniqueImages([
            source?.front_image_url,
            source?.frontImageUrl,
            source?.main_image_url,
            source?.mainImageUrl,
            source?.image_url,
            source?.imageUrl,
            typedFront,
        ])[0] || ""
    );
};

const explicitBackImageFromSource = (
    source: any,
) => {
    if (!source) {
        return "";
    }

    const structuredImages = [
        ...parseArray(source?.images),
        ...parseArray(source?.product_images),
        ...parseArray(source?.productImages),
        ...parseArray(source?.variant_images),
        ...parseArray(source?.variantImages),
    ];

    const typedBack = structuredImages.find(
        (item: any) => {
            const type = normalizeColor(
                item?.image_type ||
                    item?.imageType ||
                    item?.type ||
                    item?.view ||
                    item?.position,
            );

            return (
                type.includes("back") ||
                type.includes("rear") ||
                type.includes("reverse")
            );
        },
    );

    return (
        uniqueImages([
            source?.back_image_url,
            source?.backImageUrl,
            source?.rear_image_url,
            source?.rearImageUrl,
            typedBack,
        ])[0] || ""
    );
};

const normalizeStockSources = (
    raw: any,
    variantId: any,
    available: number,
): StockSource[] => {
    const values = Array.isArray(
        raw?.stock_sources,
    )
        ? raw.stock_sources
        : Array.isArray(raw?.stockSources)
          ? raw.stockSources
          : [];

    const sourceValues = values.length
        ? values
        : variantId
          ? [
                {
                    variant_id: variantId,
                    available_qty: available,
                },
            ]
          : [];

    const grouped =
        new Map<number, number>();

    sourceValues.forEach(
        (source: any) => {
            const id = positiveId(
                source?.variant_id ||
                    source?.variantId,
            );

            if (!id) {
                return;
            }

            const stock = Math.max(
                0,
                num(
                    source?.available_qty ??
                        source?.availableQty ??
                        Math.max(
                            0,
                            num(
                                source?.on_hand ??
                                    source?.onHand,
                            ) -
                                num(
                                    source?.reserved,
                                ),
                        ),
                ),
            );

            grouped.set(
                id,
                Math.max(
                    grouped.get(id) || 0,
                    stock,
                ),
            );
        },
    );

    return Array.from(
        grouped.entries(),
    )
        .map(
            ([
                variantIdValue,
                availableValue,
            ]) => ({
                variantId:
                    variantIdValue,
                available:
                    availableValue,
            }),
        )
        .sort(
            (a, b) =>
                b.available -
                a.available,
        );
};

const normalizeVariant = (
    raw: any,
    product: any,
): Variant => {
    const variantId =
        raw?.variant_id ||
        raw?.variantId ||
        raw?.id ||
        "";

    const productId =
        raw?.product_id ||
        raw?.productId ||
        product?.product_id ||
        product?.productId ||
        "";

    const size = text(
        raw?.size ||
            raw?.selected_size ||
            raw?.selectedSize,
    );

    const color = text(
        raw?.colour ||
            raw?.color ||
            raw?.selected_colour ||
            raw?.selectedColor ||
            raw?.selected_color,
    );

    const mrp = num(
        raw?.original_price_b2c ??
            raw?.mrp ??
            raw?.original_price ??
            product?.original_price_b2c ??
            product?.originalPrice ??
            product?.mrp ??
            product?.price,
    );

    const discount =
        firstDiscount(
            raw?.b2c_discount_pct,
            raw?.discount_b2c,
            raw?.discount_percentage,
            raw?.discount_percent,
            raw?.discount,
            product?.b2c_discount_pct,
            product?.discount_b2c,
            product?.discount_percentage,
            product?.discount_percent,
            product?.discount,
        );

    const directPrice = num(
        raw?.final_price_b2c ??
            raw?.b2c_final_price ??
            raw?.sale_price ??
            raw?.price ??
            raw?.selling_price ??
            raw?.discounted_price ??
            raw?.mahaveer_price ??
            product?.final_price_b2c ??
            product?.salePrice ??
            product?.sale_price ??
            product?.price,
        mrp,
    );

    const salePrice =
        discount > 0 &&
        mrp > 0
            ? discountedPrice(
                  mrp,
                  discount,
              )
            : directPrice;

    const originalPriceB2B = num(
        raw?.original_price_b2b ??
            raw?.originalPriceB2b ??
            raw?.cost_price ??
            product?.original_price_b2b ??
            product?.originalPriceB2b ??
            product?.cost_price ??
            mrp,
        mrp,
    );

    const b2bDiscount =
        firstDiscount(
            raw?.b2b_discount_pct,
            raw?.discount_b2b,
            product?.b2b_discount_pct,
            product?.discount_b2b,
        );

    const directB2B = num(
        raw?.final_price_b2b ??
            raw?.finalPriceB2b ??
            raw?.b2b_final_price ??
            product?.final_price_b2b ??
            product?.finalPriceB2b ??
            product?.b2b_final_price ??
            originalPriceB2B,
        originalPriceB2B,
    );

    const finalPriceB2B =
        b2bDiscount > 0 &&
        originalPriceB2B > 0
            ? discountedPrice(
                  originalPriceB2B,
                  b2bDiscount,
              )
            : directB2B;

    const onHand = num(
        raw?.on_hand ??
            raw?.onHand,
    );

    const reserved = num(
        raw?.reserved ??
            raw?.reserved_qty ??
            raw?.reservedQty,
    );

    const available = Math.max(
        0,
        num(
            raw?.available_qty ??
                raw?.availableQty ??
                Math.max(
                    0,
                    onHand - reserved,
                ),
            Math.max(
                0,
                onHand - reserved,
            ),
        ),
    );

    const imageUrl =
        explicitFrontImageFromSource(raw) ||
        explicitFrontImageFromSource(product) ||
        "";

    const backImageUrl =
        explicitBackImageFromSource(raw) ||
        "";

    const optionalNumber = (
        value: any,
    ) =>
        value === undefined ||
        value === null ||
        text(value) === ""
            ? null
            : Number.isFinite(
                    Number(value),
                )
              ? Number(value)
              : null;

    return {
        id: variantId,
        variantId,
        productId,
        designCode: text(
            raw?.design_code ||
                raw?.designCode ||
                product?.design_code ||
                product?.designCode,
        ),
        patternType: text(
            raw?.pattern_type ||
                raw?.patternType ||
                product?.pattern_type ||
                product?.patternType,
        ),
        patternCode: text(
            raw?.pattern_code ||
                raw?.patternCode ||
                product?.pattern_code ||
                product?.patternCode,
        ),
        size,
        color,
        barcode: text(
            raw?.barcode ||
                raw?.ean_code ||
                raw?.eanCode,
        ),
        mrp,
        salePrice,
        originalPriceB2B,
        finalPriceB2B,
        available,
        imageUrl,
        backImageUrl,
        weight: optionalNumber(
            raw?.weight ??
                raw?.weight_kg ??
                product?.weight ??
                product?.weight_kg,
        ),
        length: optionalNumber(
            raw?.length ??
                product?.length,
        ),
        width: optionalNumber(
            raw?.width ??
                product?.width,
        ),
        height: optionalNumber(
            raw?.height ??
                product?.height,
        ),
        hsnCode: text(
            raw?.hsn_code ||
                raw?.hsnCode ||
                product?.hsn_code ||
                product?.hsnCode,
        ),
        hsnPercentage:
            optionalNumber(
                raw?.hsn_percentage ??
                    raw?.hsnPercentage ??
                    product?.hsn_percentage ??
                    product?.hsnPercentage,
            ),
        stockSources:
            normalizeStockSources(
                raw,
                variantId,
                available,
            ),
        raw,
    };
};

const getVariants = (
    product: any,
): Variant[] => {
    if (!product) {
        return [];
    }

    const rows =
        Array.isArray(
            product?.variants,
        ) &&
        product.variants.length
            ? product.variants
            : [product];

    return rows
        .map((row: any) =>
            normalizeVariant(
                row,
                product,
            ),
        )
        .filter(
            (variant: Variant) =>
                text(
                    variant.variantId,
                ) &&
                (
                    variant.size ||
                    variant.color
                ),
        );
};

const rawColorOptions = (
    product: any,
) => {
    const options =
        product?.colorOptions ||
        product?.colourOptions ||
        product?.color_options ||
        product?.colour_options ||
        [];

    return Array.isArray(options)
        ? options
        : [];
};

const buildColorOptions = (
    product: any,
    variants: Variant[],
): ColorOption[] => {
    const provided =
        rawColorOptions(product);

    const colors = sortColors([
        ...variants.map(
            (variant) =>
                variant.color,
        ),
        ...provided.map(
            (option: any) =>
                option?.color ||
                option?.colour,
        ),
    ]);

    return colors.map(
        (color) => {
            const colorVariants =
                variants.filter(
                    (variant) =>
                        sameColor(
                            variant.color,
                            color,
                        ),
                );

            const option =
                provided.find(
                    (item: any) =>
                        sameColor(
                            item?.color ||
                                item?.colour,
                            color,
                        ),
                );

            const available =
                colorVariants.length
                    ? colorVariants.some(
                          (variant) =>
                              variant.available >
                              0,
                      )
                    : Boolean(
                          option?.available ??
                              option?.inStock ??
                              option?.in_stock,
                      );

            const variantImages =
                uniqueImages(
                    colorVariants.flatMap(
                        (variant) => [
                            variant.imageUrl,
                            variant.backImageUrl,
                            ...imageListFromSource(
                                variant.raw,
                            ),
                        ],
                    ),
                );

            const image =
                uniqueImages([
                    option?.image,
                    option?.imageUrl,
                    option?.image_url,
                    option?.frontImageUrl,
                    option?.front_image_url,
                    option?.mainImageUrl,
                    option?.main_image_url,
                    ...variantImages,
                ])[0] ||
                PLACEHOLDER;

            const backImage =
                uniqueImages([
                    option?.backImageUrl,
                    option?.back_image_url,
                    ...colorVariants.map(
                        (variant) =>
                            explicitBackImageFromSource(
                                variant.raw,
                            ),
                    ),
                ])[0] || "";

            return {
                color,
                image,
                backImage,
                available,
            };
        },
    );
};

const imagesForSelection = (
    colorOptions: ColorOption[],
    variants: Variant[],
    color: string,
): string[] => {
    const option =
        colorOptions.find(
            (item) =>
                sameColor(
                    item.color,
                    color,
                ),
        );

    const selected =
        variants.filter(
            (variant) =>
                !color ||
                sameColor(
                    variant.color,
                    color,
                ),
        );

    const frontImages =
        uniqueImages([
            option?.image,
            ...selected.map(
                (variant) =>
                    variant.imageUrl,
            ),
            ...selected.map(
                (variant) =>
                    explicitFrontImageFromSource(
                        variant.raw,
                    ),
            ),
        ]);

    const backImages =
        uniqueImages([
            option?.backImage,
            ...selected.map(
                (variant) =>
                    variant.backImageUrl,
            ),
            ...selected.map(
                (variant) =>
                    explicitBackImageFromSource(
                        variant.raw,
                    ),
            ),
        ]).filter(
            (image) =>
                !frontImages.includes(
                    image,
                ),
        );

    const values =
        uniqueImages([
            frontImages[0],
            backImages[0],
        ]);

    return values.length
        ? values
        : [PLACEHOLDER];
};

const matchingVariants = (
    variants: Variant[],
    size: string,
    color: string,
) =>
    variants.filter(
        (variant) =>
            (
                !size ||
                sameSize(
                    variant.size,
                    size,
                )
            ) &&
            (
                !color ||
                sameColor(
                    variant.color,
                    color,
                )
            ),
    );

const aggregateSources = (
    variants: Variant[],
) => {
    const grouped =
        new Map<number, number>();

    variants.forEach(
        (variant) => {
            const fallbackId =
                positiveId(
                    variant.variantId,
                );

            const sources =
                variant.stockSources.length
                    ? variant.stockSources
                    : fallbackId
                      ? [
                            {
                                variantId:
                                    fallbackId,
                                available:
                                    variant.available,
                            },
                        ]
                      : [];

            sources.forEach(
                (source) =>
                    grouped.set(
                        source.variantId,
                        Math.max(
                            grouped.get(
                                source.variantId,
                            ) || 0,
                            source.available,
                        ),
                    ),
            );
        },
    );

    return Array.from(
        grouped.entries(),
    )
        .map(
            ([
                variantId,
                available,
            ]) => ({
                variantId,
                available,
            }),
        )
        .filter(
            (source) =>
                source.available > 0,
        )
        .sort(
            (a, b) =>
                b.available -
                a.available,
        );
};

const aggregateStock = (
    variants: Variant[],
) =>
    aggregateSources(
        variants,
    ).reduce(
        (sum, source) =>
            sum +
            source.available,
        0,
    );

const productBackendId = (
    product: any,
) =>
    positiveId(
        product?.productId ||
            product?.product_id ||
            product?.id,
    );

const routeVariant = (
    variants: Variant[],
    routeId: any,
) => {
    const target =
        text(routeId);

    return (
        variants.find(
            (variant) =>
                [
                    variant.variantId,
                    variant.id,
                    variant.barcode,
                ]
                    .map(text)
                    .includes(target),
        ) || null
    );
};

const productIdentity = (
    product: any,
) =>
    text(
        product?.designKey ||
            product?.design_key ||
            product?.routeKey ||
            product?.route_key ||
            product?.designCode ||
            product?.design_code ||
            product?.productId ||
            product?.product_id ||
            product?.id,
    );

const productCategoryIdentity = (
    product: any,
) =>
    text(
        product?.categoryId ||
            product?.category_id ||
            product?.categoryName ||
            product?.category_name ||
            product?.categorySlug ||
            product?.category_slug,
    );

const buildRecommendations = (
    current: Product,
    products: Product[],
) =>
    Array.from(
        new Map(
            products
                .filter(
                    (item) =>
                        productIdentity(item) !==
                        productIdentity(
                            current,
                        ),
                )
                .map((item) => [
                    productIdentity(item),
                    item,
                ]),
        ).values(),
    )
        .sort((a, b) => {
            const ac =
                productCategoryIdentity(
                    a,
                ) ===
                productCategoryIdentity(
                    current,
                )
                    ? 1
                    : 0;

            const bc =
                productCategoryIdentity(
                    b,
                ) ===
                productCategoryIdentity(
                    current,
                )
                    ? 1
                    : 0;

            if (ac !== bc) {
                return bc - ac;
            }

            return (
                new Date(
                    (b as any)
                        ?.createdAt ||
                        (b as any)
                            ?.created_at ||
                        0,
                ).getTime() -
                new Date(
                    (a as any)
                        ?.createdAt ||
                        (a as any)
                            ?.created_at ||
                        0,
                ).getTime()
            );
        })
        .slice(0, 10);

const CustomLeftArrow = ({
    onClick,
}: any) => (
    <button
        type="button"
        onClick={onClick}
        className="absolute opacity-0 group-hover:opacity-100 left-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"
    >
        <FiChevronLeft
            size={20}
        />
    </button>
);

const CustomRightArrow = ({
    onClick,
}: any) => (
    <button
        type="button"
        onClick={onClick}
        className="absolute opacity-0 group-hover:opacity-100 right-2 cursor-pointer top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-gray-100 text-gray-400 hover:text-black transition z-10"
    >
        <FiChevronRight
            size={20}
        />
    </button>
);

const RatingStars = ({
    rating,
}: {
    rating: number;
}) => {
    const full =
        Math.floor(rating);

    const half =
        rating % 1 !== 0;

    const empty =
        5 -
        full -
        (half ? 1 : 0);

    return (
        <div className="flex items-center gap-1">
            {Array.from({
                length: full,
            }).map((_, index) => (
                <FaStar
                    key={`full-${index}`}
                    size={14}
                />
            ))}

            {half ? (
                <FaStarHalfAlt
                    size={14}
                />
            ) : null}

            {Array.from({
                length: empty,
            }).map((_, index) => (
                <FaRegStar
                    key={`empty-${index}`}
                    size={14}
                />
            ))}
        </div>
    );
};

const ProductDetails:
    React.FC = () => {
    const navigate =
        useNavigate();

    const { id } =
        useParams<{
            id: string;
        }>();

    const [searchParams] =
        useSearchParams();

    const requestedVariantId =
        text(
            searchParams.get(
                "variant_id",
            ) ||
                searchParams.get(
                    "variantId",
                ),
        );

    const [
        product,
        setProduct,
    ] =
        useState<Product | null>(
            null,
        );

    const [
        recommended,
        setRecommended,
    ] =
        useState<Product[]>([]);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        loadError,
        setLoadError,
    ] =
        useState("");

    const [
        selectedColor,
        setSelectedColor,
    ] =
        useState("");

    const [
        selectedSize,
        setSelectedSize,
    ] =
        useState("");

    const [
        quantity,
        setQuantity,
    ] =
        useState(1);

    const [
        selectedImage,
        setSelectedImage,
    ] =
        useState(0);

    const [
        lightboxImage,
        setLightboxImage,
    ] =
        useState(0);

    const [
        lightboxOpen,
        setLightboxOpen,
    ] =
        useState(false);

    const [
        adding,
        setAdding,
    ] =
        useState(false);

    const [
        cartError,
        setCartError,
    ] =
        useState("");

    const [
        cartMessage,
        setCartMessage,
    ] =
        useState("");

    const [
        wishlisted,
        setWishlisted,
    ] =
        useState(false);

    const [
        updatingWishlist,
        setUpdatingWishlist,
    ] =
        useState(false);

    const mainCarouselRef =
        useRef<any>(null);

    const lightboxCarouselRef =
        useRef<any>(null);

    const colorCarouselRef =
        useRef<HTMLDivElement>(null);

    const variants =
        useMemo(
            () =>
                getVariants(product),
            [product],
        );

    const colorOptions =
        useMemo(
            () =>
                buildColorOptions(
                    product,
                    variants,
                ),
            [product, variants],
        );

    const colors =
        useMemo(
            () =>
                colorOptions.map(
                    (option) =>
                        option.color,
                ),
            [colorOptions],
        );

    const sizes =
        useMemo(
            () =>
                sortSizes(
                    (
                        selectedColor
                            ? variants.filter(
                                  (variant) =>
                                      sameColor(
                                          variant.color,
                                          selectedColor,
                                      ),
                              )
                            : variants
                    ).map(
                        (variant) =>
                            variant.size,
                    ),
                ),
            [
                variants,
                selectedColor,
            ],
        );

    const selectedVariants =
        useMemo(
            () =>
                matchingVariants(
                    variants,
                    selectedSize,
                    selectedColor,
                ),
            [
                variants,
                selectedSize,
                selectedColor,
            ],
        );

    const selectedVariant =
        selectedVariants[0] ||
        variants.find(
            (variant) =>
                (
                    !selectedColor ||
                    sameColor(
                        variant.color,
                        selectedColor,
                    )
                ) &&
                (
                    !selectedSize ||
                    sameSize(
                        variant.size,
                        selectedSize,
                    )
                ),
        ) ||
        variants[0] ||
        null;

    const stockSources =
        useMemo(
            () =>
                aggregateSources(
                    selectedVariants.length
                        ? selectedVariants
                        : selectedVariant
                          ? [
                                selectedVariant,
                            ]
                          : [],
                ),
            [
                selectedVariants,
                selectedVariant,
            ],
        );

    const availableStock =
        useMemo(
            () =>
                aggregateStock(
                    selectedVariants.length
                        ? selectedVariants
                        : selectedVariant
                          ? [
                                selectedVariant,
                            ]
                          : [],
                ),
            [
                selectedVariants,
                selectedVariant,
            ],
        );

    const images =
        useMemo(
            () =>
                imagesForSelection(
                    colorOptions,
                    selectedVariants.length
                        ? selectedVariants
                        : selectedVariant
                          ? [
                                selectedVariant,
                            ]
                          : [],
                    selectedColor,
                ),
            [
                colorOptions,
                selectedVariants,
                selectedVariant,
                selectedColor,
            ],
        );

    const backendProductId =
        useMemo(
            () =>
                productBackendId(
                    product,
                ),
            [product],
        );

    const storedUser =
        getStoredUser();

    const isB2B =
        isBusinessUser(
            storedUser,
        );

    const currentPrice =
        isB2B
            ? selectedVariant
                  ?.finalPriceB2B ||
              num(
                  (product as any)
                      ?.final_price_b2b ??
                      (product as any)
                          ?.finalPriceB2b ??
                      (product as any)
                          ?.price,
              )
            : selectedVariant
                  ?.salePrice ||
              num(
                  (product as any)
                      ?.final_price_b2c ??
                      (product as any)
                          ?.price,
              );

    const comparePrice =
        isB2B
            ? selectedVariant
                  ?.originalPriceB2B ||
              num(
                  (product as any)
                      ?.original_price_b2b ??
                      (product as any)
                          ?.originalPriceB2b ??
                      (product as any)
                          ?.mrp ??
                      currentPrice,
                  currentPrice,
              )
            : selectedVariant
                  ?.mrp ||
              num(
                  (product as any)
                      ?.originalPrice ??
                      (product as any)
                          ?.mrp ??
                      (product as any)
                          ?.price ??
                      currentPrice,
                  currentPrice,
              );

    const selectedWishlistVariantId =
        positiveId(
            selectedVariant
                ?.variantId,
        );

    const selectedPatternType =
        text(
            selectedVariant
                ?.patternType ||
                (product as any)
                    ?.patternType ||
                (product as any)
                    ?.pattern_type,
        );

    const selectedDesignCode =
        text(
            selectedVariant
                ?.designCode ||
                (product as any)
                    ?.designCode ||
                (product as any)
                    ?.design_code,
        );

    const path = text(
        (product as any)
            ?.categoryPath ||
            (product as any)
                ?.category_path ||
            [
                (product as any)
                    ?.parentCategoryName ||
                    (product as any)
                        ?.parent_category_name,
                (product as any)
                    ?.categoryName ||
                    (product as any)
                        ?.category_name,
            ]
                .filter(Boolean)
                .join(" > "),
    );

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
                const found =
                    await fetchProductById(
                        id,
                        3,
                    );

                if (!alive) {
                    return;
                }

                if (!found) {
                    setProduct(null);
                    setLoadError(
                        "Product not found",
                    );
                    return;
                }

                const rows =
                    getVariants(found);

                const available =
                    rows.filter(
                        (variant) =>
                            variant.available >
                            0,
                    );

                const usable =
                    available.length
                        ? available
                        : rows;

                const routed =
                    requestedVariantId
                        ? routeVariant(
                              usable,
                              requestedVariantId,
                          ) ||
                          routeVariant(
                              rows,
                              requestedVariantId,
                          )
                        : null;

                const productColor =
                    text(
                        (found as any)
                            ?.selectedColor ||
                            (found as any)
                                ?.selected_colour ||
                            (found as any)
                                ?.displayColor ||
                            (found as any)
                                ?.display_color ||
                            (found as any)
                                ?.color ||
                            (found as any)
                                ?.colour,
                    );

                const productSize =
                    text(
                        (found as any)
                            ?.selectedSize ||
                            (found as any)
                                ?.selected_size ||
                            (found as any)
                                ?.displaySize ||
                            (found as any)
                                ?.display_size ||
                            (found as any)
                                ?.size,
                    );

                const first =
                    routed ||
                    usable.find(
                        (variant) =>
                            (
                                !productColor ||
                                sameColor(
                                    variant.color,
                                    productColor,
                                )
                            ) &&
                            (
                                !productSize ||
                                sameSize(
                                    variant.size,
                                    productSize,
                                )
                            ),
                    ) ||
                    usable[0] ||
                    rows[0];

                setProduct(found);

                setSelectedColor(
                    first?.color ||
                        productColor ||
                        text(
                            (found as any)
                                ?.colors?.[0],
                        ),
                );

                setSelectedSize(
                    first?.size ||
                        productSize ||
                        text(
                            (found as any)
                                ?.sizes?.[0],
                        ),
                );

                setQuantity(1);
                setSelectedImage(0);
                setLightboxImage(0);
                setCartError("");
                setCartMessage("");
            } catch (
                error: any
            ) {
                if (alive) {
                    setProduct(null);

                    setLoadError(
                        error?.message ||
                            "Unable to load product",
                    );
                }
            } finally {
                if (alive) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            alive = false;
        };
    }, [
        id,
        requestedVariantId,
    ]);

    useEffect(() => {
        if (!variants.length) {
            return;
        }

        if (
            matchingVariants(
                variants,
                selectedSize,
                selectedColor,
            ).length
        ) {
            return;
        }

        const next =
            variants.find(
                (variant) =>
                    selectedColor &&
                    sameColor(
                        variant.color,
                        selectedColor,
                    ),
            ) ||
            variants.find(
                (variant) =>
                    selectedSize &&
                    sameSize(
                        variant.size,
                        selectedSize,
                    ),
            ) ||
            variants[0];

        if (next) {
            setSelectedColor(
                next.color,
            );

            setSelectedSize(
                next.size,
            );
        }
    }, [
        variants,
        selectedColor,
        selectedSize,
    ]);

    useEffect(() => {
        if (
            !selectedColor ||
            !sizes.length
        ) {
            return;
        }

        if (
            !sizes.some(
                (size) =>
                    sameSize(
                        size,
                        selectedSize,
                    ),
            )
        ) {
            setSelectedSize(
                sizes[0],
            );
        }
    }, [
        selectedColor,
        selectedSize,
        sizes,
    ]);

    useEffect(() => {
        setQuantity(1);
        setSelectedImage(0);
        setLightboxImage(0);

        setTimeout(
            () =>
                mainCarouselRef
                    .current
                    ?.goToSlide?.(2),
            0,
        );
    }, [
        selectedColor,
        selectedSize,
    ]);

    useEffect(() => {
        let alive = true;

        const load = async () => {
            if (!product) {
                setRecommended([]);
                return;
            }

            try {
                const products =
                    await fetchProductsByGender(
                        (product as any)
                            ?.gender,
                        3,
                    );

                if (alive) {
                    setRecommended(
                        buildRecommendations(
                            product,
                            products,
                        ),
                    );
                }
            } catch {
                if (alive) {
                    setRecommended([]);
                }
            }
        };

        void load();

        return () => {
            alive = false;
        };
    }, [product]);

    useEffect(() => {
        const sync = () => {
            const user =
                getStoredUser();

            const userId =
                Number(
                    user?.id || 0,
                );

            setWishlisted(
                Boolean(
                    userId &&
                        selectedWishlistVariantId &&
                        readWishlist(
                            userId,
                        ).includes(
                            selectedWishlistVariantId,
                        ),
                ),
            );
        };

        sync();

        window.addEventListener(
            "wishlist-updated",
            sync,
        );

        return () =>
            window.removeEventListener(
                "wishlist-updated",
                sync,
            );
    }, [
        selectedWishlistVariantId,
    ]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col gap-4 items-center justify-center text-center px-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    Product not found
                </h1>

                <p className="text-gray-500">
                    {loadError ||
                        "Unable to load this product."}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/collections",
                        )
                    }
                    className="px-8 py-3 bg-primary text-black font-bold uppercase text-sm"
                >
                    Back to collections
                </button>
            </div>
        );
    }

    const formatMoney = (
        value: number,
    ) =>
        `₹${Number(
            value || 0,
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2,
            },
        )}`;

    const changeColor = (
        color: string,
    ) => {
        setCartError("");
        setCartMessage("");
        setSelectedColor(color);

        const colorVariants =
            variants.filter(
                (variant) =>
                    sameColor(
                        variant.color,
                        color,
                    ),
            );

        const availableVariants =
            colorVariants.filter(
                (variant) =>
                    variant.available > 0,
            );

        const usable =
            availableVariants.length
                ? availableVariants
                : colorVariants;

        const validSizes =
            sortSizes(
                usable.map(
                    (variant) =>
                        variant.size,
                ),
            );

        if (
            validSizes.length &&
            !validSizes.some(
                (size) =>
                    sameSize(
                        size,
                        selectedSize,
                    ),
            )
        ) {
            setSelectedSize(
                validSizes[0],
            );
        }
    };

    const changeSize = (
        size: string,
    ) => {
        setCartError("");
        setCartMessage("");
        setSelectedSize(size);

        const sizeVariants =
            variants.filter(
                (variant) =>
                    sameSize(
                        variant.size,
                        size,
                    ),
            );

        const availableVariants =
            sizeVariants.filter(
                (variant) =>
                    variant.available > 0,
            );

        const usable =
            availableVariants.length
                ? availableVariants
                : sizeVariants;

        const validColors =
            sortColors(
                usable.map(
                    (variant) =>
                        variant.color,
                ),
            );

        if (
            selectedColor &&
            !validColors.some(
                (color) =>
                    sameColor(
                        color,
                        selectedColor,
                    ),
            )
        ) {
            setSelectedColor(
                validColors[0] || "",
            );
        }
    };

    const changeQuantity = (
        type:
            | "plus"
            | "minus",
    ) =>
        setQuantity(
            (current) =>
                type === "minus"
                    ? Math.max(
                          1,
                          current - 1,
                      )
                    : availableStock > 0
                      ? Math.min(
                            availableStock,
                            current + 1,
                        )
                      : current + 1,
        );

    const addProductToCart =
        async () => {
            const user =
                getStoredUser();

            const userId =
                Number(
                    user?.id || 0,
                );

            if (!userId) {
                navigate("/auth");
                return false;
            }

            if (
                sizes.length &&
                !selectedSize
            ) {
                setCartError(
                    "Please select size.",
                );
                return false;
            }

            if (
                colors.length &&
                !selectedColor
            ) {
                setCartError(
                    "Please select color.",
                );
                return false;
            }

            if (
                !selectedVariants.length ||
                !stockSources.length
            ) {
                setCartError(
                    "Selected size and color combination is not available.",
                );
                return false;
            }

            if (
                quantity >
                availableStock
            ) {
                setCartError(
                    `Only ${availableStock} stock available.`,
                );
                return false;
            }

            const realProductId =
                positiveId(
                    selectedVariant
                        ?.productId,
                ) ||
                backendProductId;

            if (!realProductId) {
                setCartError(
                    "Product id not found.",
                );
                return false;
            }

            let remaining =
                quantity;

            for (
                const source of
                stockSources
            ) {
                if (remaining <= 0) {
                    break;
                }

                const sourceQuantity =
                    Math.min(
                        remaining,
                        source.available,
                    );

                if (
                    sourceQuantity <= 0
                ) {
                    continue;
                }

                const sourceVariant =
                    selectedVariants.find(
                        (variant) =>
                            positiveId(
                                variant.variantId,
                            ) ===
                            source.variantId,
                    ) ||
                    variants.find(
                        (variant) =>
                            positiveId(
                                variant.variantId,
                            ) ===
                            source.variantId,
                    ) ||
                    selectedVariant;

                if (!sourceVariant) {
                    continue;
                }

                await addToCart({
                    user_id: userId,
                    product_id:
                        positiveId(
                            sourceVariant
                                .productId,
                        ) ||
                        realProductId,
                    variant_id:
                        source.variantId,
                    design_code:
                        sourceVariant
                            .designCode ||
                        selectedDesignCode ||
                        null,
                    pattern_type:
                        sourceVariant
                            .patternType ||
                        selectedPatternType ||
                        null,
                    pattern_code:
                        sourceVariant
                            .patternCode ||
                        null,
                    ean_code:
                        sourceVariant
                            .barcode ||
                        null,
                    selected_size:
                        sourceVariant.size ||
                        selectedSize,
                    selected_color:
                        sourceVariant.color ||
                        selectedColor,
                    quantity:
                        sourceQuantity,
                    image_url:
                        sourceVariant
                            .imageUrl ||
                        images[0] ||
                        null,
                    weight:
                        sourceVariant.weight,
                    weight_kg:
                        sourceVariant.weight,
                    length:
                        sourceVariant.length,
                    width:
                        sourceVariant.width,
                    height:
                        sourceVariant.height,
                    hsn_code:
                        sourceVariant
                            .hsnCode ||
                        null,
                    hsn_percentage:
                        sourceVariant
                            .hsnPercentage,
                });

                remaining -=
                    sourceQuantity;
            }

            if (remaining > 0) {
                throw new Error(
                    "Unable to reserve the requested quantity.",
                );
            }

            setCartError("");

            setCartMessage(
                "Added to cart successfully.",
            );

            return true;
        };

    const handleAddToCart =
        async () => {
            if (adding) {
                return;
            }

            setAdding(true);

            try {
                await addProductToCart();
            } catch (
                error: any
            ) {
                setCartError(
                    error?.message ||
                        "Unable to add to cart",
                );

                setCartMessage("");
            } finally {
                setAdding(false);
            }
        };

    const handleBuyNow =
        async () => {
            if (adding) {
                return;
            }

            setAdding(true);

            try {
                if (
                    await addProductToCart()
                ) {
                    navigate("/cart");
                }
            } catch (
                error: any
            ) {
                setCartError(
                    error?.message ||
                        "Unable to add to cart",
                );

                setCartMessage("");
            } finally {
                setAdding(false);
            }
        };

    const toggleWishlist =
        async () => {
            const user =
                getStoredUser();

            const userId =
                Number(
                    user?.id || 0,
                );

            if (!userId) {
                navigate("/auth");
                return;
            }

            if (
                !selectedWishlistVariantId ||
                updatingWishlist
            ) {
                return;
            }

            setUpdatingWishlist(
                true,
            );

            try {
                const response =
                    await fetch(
                        `${API_BASE}/api/wishlist`,
                        {
                            method:
                                wishlisted
                                    ? "DELETE"
                                    : "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body:
                                JSON.stringify({
                                    user_id:
                                        userId,
                                    product_id:
                                        selectedWishlistVariantId,
                                    variant_id:
                                        selectedWishlistVariantId,
                                    actual_product_id:
                                        backendProductId,
                                }),
                        },
                    );

                const data =
                    await response
                        .json()
                        .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                            "Unable to update wishlist",
                    );
                }

                const ids =
                    wishlisted
                        ? readWishlist(
                              userId,
                          ).filter(
                              (item) =>
                                  item !==
                                  selectedWishlistVariantId,
                          )
                        : Array.from(
                              new Set([
                                  ...readWishlist(
                                      userId,
                                  ),
                                  selectedWishlistVariantId,
                              ]),
                          );

                writeWishlist(
                    userId,
                    ids,
                );

                setWishlisted(
                    !wishlisted,
                );
            } finally {
                setUpdatingWishlist(
                    false,
                );
            }
        };

    const share = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title:
                        (product as any)
                            ?.title,
                    text:
                        `Check out ${(product as any)?.title}`,
                    url:
                        window.location.href,
                });
            } else {
                await navigator
                    .clipboard
                    .writeText(
                        window.location.href,
                    );

                alert(
                    "Link copied to clipboard!",
                );
            }
        } catch {}
    };

    const mainResponsive = {
        desktop: {
            breakpoint: {
                max: 3000,
                min: 0,
            },
            items: 1,
        },
    };

    const hasMultipleImages =
        images.length > 1;

    const hasRealImages =
        images.some(
            (image) =>
                !image.includes(
                    "placeholder.svg",
                ),
        );

    const handleThumb = (
        index: number,
    ) => {
        setSelectedImage(index);

        if (hasMultipleImages) {
            mainCarouselRef
                .current
                ?.goToSlide?.(
                    index + 2,
                );
        }
    };

    const scrollColorCarousel = (
        direction: "left" | "right",
    ) => {
        const element =
            colorCarouselRef.current;

        if (!element) {
            return;
        }

        element.scrollBy({
            left:
                direction === "left"
                    ? -320
                    : 320,
            behavior: "smooth",
        });
    };

    return (
        <div className="w-full bg-white font-montserrat py-6 pt-4 md:py-8 lg:py-16 lg:pt-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
                    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
                        {hasRealImages ? (
                            <div className="hidden lg:flex flex-col w-20 lg:w-22 shrink-0 overflow-y-auto h-[500px] xl:h-[540px] gap-3 py-2 scrollbar-none">
                                {images.map(
                                    (
                                        src,
                                        index,
                                    ) => (
                                        <button
                                            type="button"
                                            key={`${src}-${index}`}
                                            onClick={() =>
                                                handleThumb(
                                                    index,
                                                )
                                            }
                                            className={`w-full aspect-3/4 rounded-[9px] shrink-0 cursor-pointer overflow-hidden transition-all ${
                                                index ===
                                                selectedImage
                                                    ? "opacity-100 border border-[#292d35] p-[3px]"
                                                    : "opacity-60 hover:opacity-100"
                                            }`}
                                        >
                                            <img
                                                src={src}
                                                alt={`Thumb ${index + 1}`}
                                                loading="eager"
                                                className="w-full h-full object-cover object-top bg-gray-50 rounded-[6px]"
                                                onError={(
                                                    event,
                                                ) => {
                                                    event.currentTarget.src =
                                                        PLACEHOLDER;
                                                }}
                                            />
                                        </button>
                                    ),
                                )}
                            </div>
                        ) : null}

                        <div className="group flex-1 relative bg-white h-[430px] sm:h-[480px] lg:h-[500px] xl:h-[540px] overflow-hidden min-w-0 z-0">
                            <button
                                type="button"
                                className="lg:hidden relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white cursor-pointer"
                                onClick={() => {
                                    setLightboxImage(
                                        Math.min(
                                            selectedImage,
                                            images.length - 1,
                                        ),
                                    );

                                    setLightboxOpen(
                                        true,
                                    );
                                }}
                            >
                                <img
                                    key={`${images[selectedImage] || images[0]}-${selectedImage}`}
                                    src={
                                        images[selectedImage] ||
                                        images[0] ||
                                        PLACEHOLDER
                                    }
                                    alt={`${(product as any)?.title} - Image ${selectedImage + 1}`}
                                    loading="eager"
                                    className="block h-full w-full rounded-2xl bg-white object-contain object-center"
                                    onError={(
                                        event,
                                    ) => {
                                        event.currentTarget.src =
                                            PLACEHOLDER;
                                    }}
                                />
                            </button>

                            <div className="hidden lg:block h-full w-full">
                            {hasMultipleImages ? (
                                <Carousel
                                    ref={
                                        mainCarouselRef
                                    }
                                    responsive={
                                        mainResponsive
                                    }
                                    infinite
                                    customLeftArrow={
                                        <CustomLeftArrow />
                                    }
                                    customRightArrow={
                                        <CustomRightArrow />
                                    }
                                    afterChange={(
                                        _previous: number,
                                        state: any,
                                    ) =>
                                        setSelectedImage(
                                            (
                                                state.currentSlide -
                                                2 +
                                                images.length
                                            ) %
                                                images.length,
                                        )
                                    }
                                    itemClass="flex items-center justify-center h-full w-full"
                                    containerClass="h-full w-full"
                                    sliderClass="h-full"
                                >
                                    {images.map(
                                        (
                                            src,
                                            index,
                                        ) => (
                                            <button
                                                type="button"
                                                className="w-full h-full relative cursor-pointer"
                                                key={`${src}-${index}`}
                                                onClick={() => {
                                                    setLightboxImage(
                                                        index,
                                                    );

                                                    setLightboxOpen(
                                                        true,
                                                    );

                                                    setTimeout(
                                                        () =>
                                                            lightboxCarouselRef
                                                                .current
                                                                ?.goToSlide?.(
                                                                    index +
                                                                        2,
                                                                ),
                                                        0,
                                                    );
                                                }}
                                            >
                                                <img
                                                    src={src}
                                                    alt={`${(product as any)?.title} - Image ${index + 1}`}
                                                    loading={
                                                        index === 0
                                                            ? "eager"
                                                            : "lazy"
                                                    }
                                                    className="absolute inset-0 w-full h-full object-contain object-center rounded-2xl bg-white"
                                                    onError={(
                                                        event,
                                                    ) => {
                                                        event.currentTarget.src =
                                                            PLACEHOLDER;
                                                    }}
                                                />
                                            </button>
                                        ),
                                    )}
                                </Carousel>
                            ) : (
                                <button
                                    type="button"
                                    className="w-full h-full relative cursor-pointer"
                                    onClick={() => {
                                        setLightboxImage(
                                            0,
                                        );
                                        setLightboxOpen(
                                            true,
                                        );
                                    }}
                                >
                                    <img
                                        src={images[0]}
                                        alt={
                                            (product as any)
                                                ?.title
                                        }
                                        loading="eager"
                                        className="absolute inset-0 w-full h-full object-contain object-center rounded-2xl bg-white"
                                        onError={(
                                            event,
                                        ) => {
                                            event.currentTarget.src =
                                                PLACEHOLDER;
                                        }}
                                    />
                                </button>
                            )}
                            </div>

                            <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-3 z-10">
                                <button
                                    type="button"
                                    onClick={share}
                                    aria-label="Share product"
                                    className="w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-700 hover:text-black"
                                >
                                    <FiShare2
                                        size={18}
                                    />
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        toggleWishlist
                                    }
                                    aria-label="Toggle wishlist"
                                    disabled={
                                        updatingWishlist
                                    }
                                    className={`w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer disabled:opacity-60 ${
                                        wishlisted
                                            ? "text-red-500"
                                            : "text-gray-700 hover:text-black"
                                    }`}
                                >
                                    <FiHeart
                                        size={18}
                                        className={
                                            wishlisted
                                                ? "fill-red-500"
                                                : ""
                                        }
                                    />
                                </button>
                            </div>
                        </div>

                        {hasMultipleImages ? (
                            <div className="lg:hidden mt-4 flex gap-3 overflow-x-auto">
                                {images.map(
                                    (
                                        src,
                                        index,
                                    ) => (
                                        <button
                                            type="button"
                                            key={`${src}-${index}`}
                                            className={`w-20 shrink-0 aspect-3/4 overflow-hidden ${
                                                index ===
                                                selectedImage
                                                    ? "opacity-100 border border-black"
                                                    : "opacity-60"
                                            }`}
                                            onClick={() =>
                                                handleThumb(
                                                    index,
                                                )
                                            }
                                        >
                                            <img
                                                src={src}
                                                alt={`Thumb ${index + 1}`}
                                                className="w-full h-full object-cover bg-gray-50"
                                                onError={(
                                                    event,
                                                ) => {
                                                    event.currentTarget.src =
                                                        PLACEHOLDER;
                                                }}
                                            />
                                        </button>
                                    ),
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 flex flex-col py-2 min-w-0">
                        <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
                            {
                                (product as any)
                                    ?.title
                            }
                        </h1>

                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {
                                (product as any)
                                    ?.brand
                            }
                        </p>

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            {selectedPatternType ? (
                                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedPatternType}
                                </span>
                            ) : null}

                            {isB2B ? (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                                    B2B Price
                                </span>
                            ) : null}
                        </div>

                        {path ? (
                            <p className="text-xs md:text-sm text-gray-400 mb-3">
                                {path}
                            </p>
                        ) : null}

                        <div className="flex items-center flex-wrap gap-4 mb-4">
                            <span className="text-2xl font-bold text-gray-900">
                                {formatMoney(
                                    currentPrice,
                                )}
                            </span>

                            {comparePrice >
                            currentPrice ? (
                                <>
                                    <span className="text-lg text-gray-400 line-through">
                                        {formatMoney(
                                            comparePrice,
                                        )}
                                    </span>

                                    <span className="text-base font-bold text-green-600 tracking-tight">
                                        {Math.round(
                                            (
                                                (
                                                    comparePrice -
                                                    currentPrice
                                                ) /
                                                comparePrice
                                            ) *
                                                100,
                                        )}
                                        % OFF
                                    </span>
                                </>
                            ) : null}

                            <span className="text-gray-300 hidden sm:inline">
                                |
                            </span>

                            <div className="flex items-center gap-1 text-[#f5b82e]">
                                <RatingStars
                                    rating={
                                        (product as any)
                                            ?.ratings
                                            ?.average || 0
                                    }
                                />

                                <span className="text-gray-500 text-sm ml-2 font-medium">
                                    (
                                    {(product as any)
                                        ?.ratings?.count ||
                                        0}{" "}
                                    reviews)
                                </span>
                            </div>
                        </div>

                        <div
                            className="prose prose-sm text-gray-500 leading-relaxed mb-4"
                            dangerouslySetInnerHTML={{
                                __html:
                                    (product as any)
                                        ?.description ||
                                    "",
                            }}
                        />

                        <div className="flex flex-col gap-6 mb-6">
                            {colorOptions.length ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                            Color
                                        </span>

                                        {selectedColor ? (
                                            <span className="text-sm font-semibold text-gray-600">
                                                {selectedColor}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="relative">
                                        {colorOptions.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    scrollColorCarousel(
                                                        "left",
                                                    )
                                                }
                                                aria-label="Previous colors"
                                                className="absolute left-0 top-[48px] z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50"
                                            >
                                                <FiChevronLeft
                                                    size={18}
                                                />
                                            </button>
                                        ) : null}

                                        <div
                                            ref={colorCarouselRef}
                                            className="flex w-full flex-nowrap gap-3 overflow-x-auto scroll-smooth px-1 pb-2 scrollbar-none"
                                        >
                                            {colorOptions.map(
                                                (option) => {
                                                    const selected =
                                                        sameColor(
                                                            option.color,
                                                            selectedColor,
                                                        );

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={
                                                                option.color
                                                            }
                                                            onClick={() =>
                                                                changeColor(
                                                                    option.color,
                                                                )
                                                            }
                                                            disabled={
                                                                !option.available
                                                            }
                                                            title={
                                                                option.available
                                                                    ? option.color
                                                                    : `${option.color} is out of stock`
                                                            }
                                                            aria-label={`Select Color ${option.color}`}
                                                            className={`group w-[78px] shrink-0 text-center transition-all sm:w-[88px] ${
                                                                option.available
                                                                    ? "cursor-pointer"
                                                                    : "cursor-not-allowed"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`relative block aspect-[3/4] overflow-hidden rounded-lg bg-gray-50 transition-all ${
                                                                    selected
                                                                        ? "border-2 border-gray-900 p-[2px] shadow-sm"
                                                                        : option.available
                                                                          ? "border border-gray-200 group-hover:border-gray-500"
                                                                          : "border border-gray-200 opacity-45 grayscale"
                                                                }`}
                                                            >
                                                                <img
                                                                    src={
                                                                        option.image
                                                                    }
                                                                    alt={`${(product as any)?.title} - ${option.color}`}
                                                                    loading="lazy"
                                                                    className="h-full w-full rounded-[5px] object-cover object-top bg-gray-50"
                                                                    onError={(
                                                                        event,
                                                                    ) => {
                                                                        event.currentTarget.src =
                                                                            PLACEHOLDER;
                                                                    }}
                                                                />

                                                                {!option.available ? (
                                                                    <span className="absolute inset-x-1 bottom-1 rounded bg-white/90 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-600">
                                                                        Out of stock
                                                                    </span>
                                                                ) : null}
                                                            </span>

                                                            <span
                                                                className={`mt-2 block min-h-[32px] text-[11px] font-semibold leading-4 sm:text-xs ${
                                                                    selected
                                                                        ? "text-gray-900"
                                                                        : option.available
                                                                          ? "text-gray-600 group-hover:text-gray-900"
                                                                          : "text-gray-400"
                                                                }`}
                                                            >
                                                                {option.color}
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>

                                        {colorOptions.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    scrollColorCarousel(
                                                        "right",
                                                    )
                                                }
                                                aria-label="Next colors"
                                                className="absolute right-0 top-[48px] z-20 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50"
                                            >
                                                <FiChevronRight
                                                    size={18}
                                                />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {sizes.length ? (
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                        Size
                                    </span>

                                    <div className="flex flex-wrap gap-3">
                                        {sizes.map(
                                            (size) => {
                                                const available =
                                                    matchingVariants(
                                                        variants,
                                                        size,
                                                        selectedColor,
                                                    ).some(
                                                        (variant) =>
                                                            variant.available >
                                                            0,
                                                    );

                                                return (
                                                    <button
                                                        type="button"
                                                        key={size}
                                                        onClick={() =>
                                                            changeSize(
                                                                size,
                                                            )
                                                        }
                                                        disabled={
                                                            !available
                                                        }
                                                        className={`min-w-12 px-4 py-2.5 rounded-sm text-sm font-source-sans font-bold uppercase tracking-wider transition-all border ${
                                                            sameSize(
                                                                size,
                                                                selectedSize,
                                                            )
                                                                ? "bg-gray-900 text-white border-gray-900"
                                                                : available
                                                                  ? "bg-white text-gray-800 border-gray-300 hover:border-gray-900"
                                                                  : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                                                        }`}
                                                    >
                                                        {size}
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {availableStock > 0 &&
                        availableStock <= 10 ? (
                            <div className="mb-4 inline-flex w-fit items-center rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                                Hurry up! Last{" "}
                                {availableStock}{" "}
                                stock left
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-4 mb-2">
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() =>
                                        changeQuantity(
                                            "minus",
                                        )
                                    }
                                    className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition"
                                >
                                    <FiMinus
                                        size={16}
                                    />
                                </button>

                                <input
                                    type="text"
                                    value={quantity}
                                    readOnly
                                    className="w-12 h-12 text-center text-gray-800 font-bold outline-none bg-white font-source-sans border-y border-gray-200"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        changeQuantity(
                                            "plus",
                                        )
                                    }
                                    disabled={
                                        availableStock >
                                            0 &&
                                        quantity >=
                                            availableStock
                                    }
                                    className="w-12 h-12 cursor-pointer flex justify-center items-center text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-sm text-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <FiPlus
                                        size={16}
                                    />
                                </button>
                            </div>

                            <div className="md:flex hidden flex-col sm:flex-row gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={
                                        handleAddToCart
                                    }
                                    disabled={
                                        adding ||
                                        availableStock <=
                                            0
                                    }
                                    className={`flex-1 cursor-pointer py-3.5 flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${
                                        availableStock <=
                                        0
                                            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                            : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50"
                                    }`}
                                >
                                    {adding ? (
                                        <span className="animate-pulse">
                                            Adding...
                                        </span>
                                    ) : (
                                        <>
                                            <FiShoppingBag
                                                size={16}
                                            />

                                            <span>
                                                Add to Cart
                                            </span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleBuyNow
                                    }
                                    disabled={
                                        adding ||
                                        availableStock <=
                                            0
                                    }
                                    className={`flex-1 py-3.5 cursor-pointer flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wider text-sm font-source-sans transition-all shadow-sm border ${
                                        availableStock <=
                                        0
                                            ? "bg-gray-200 text-gray-400 border-transparent cursor-not-allowed"
                                            : "bg-primary/90 hover:bg-primary text-black border-primary"
                                    }`}
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>

                        {cartError ? (
                            <p className="text-red-500 text-sm mt-2">
                                {cartError}
                            </p>
                        ) : null}

                        {cartMessage ? (
                            <p className="text-green-600 text-sm mt-2">
                                {cartMessage}
                            </p>
                        ) : null}

                        <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-100 text-gray-600 text-sm font-medium">
                            <div className="flex items-center gap-3">
                                <FiTruck
                                    size={18}
                                />

                                <span>
                                    Estimated
                                    Delivery: 4 TO
                                    6 DAYS
                                </span>
                            </div>

                            <button
                                type="button"
                                className="flex items-center gap-3 hover:text-black transition self-start cursor-pointer"
                            >
                                <FiHelpCircle
                                    size={18}
                                />
                                Ask a Question
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {recommended.length ? (
                <div className="mt-12 md:mt-20 border-t border-gray-100 pt-8 md:pt-16">
                    <NamedSection
                        title="You May Also Like"
                        productData={
                            recommended
                        }
                        autoplay={false}
                    />
                </div>
            ) : null}

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 md:hidden">
                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={
                            handleAddToCart
                        }
                        disabled={
                            adding ||
                            availableStock <= 0
                        }
                        className={`flex-1 py-2 flex items-center justify-center rounded-sm font-bold uppercase text-sm border ${
                            availableStock <=
                            0
                                ? "bg-gray-50 text-gray-400 border-gray-200"
                                : "bg-white text-gray-900 border-gray-900"
                        }`}
                    >
                        {adding
                            ? "Adding..."
                            : "Add to Cart"}
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleBuyNow
                        }
                        disabled={
                            adding ||
                            availableStock <= 0
                        }
                        className={`flex-[1.5] py-2 flex items-center justify-center rounded-sm font-bold uppercase text-md border ${
                            availableStock <=
                            0
                                ? "bg-gray-200 text-gray-400 border-transparent"
                                : "bg-primary text-black border-primary"
                        }`}
                    >
                        {currentPrice
                            ? `Buy at ${formatMoney(currentPrice)}`
                            : "Buy Now"}
                    </button>
                </div>
            </div>

            <div
                className={`fixed inset-0 bg-white flex flex-col items-center justify-between pt-16 pb-8 px-4 h-dvh w-full transition-all duration-300 ${
                    lightboxOpen
                        ? "z-[9999] opacity-100 pointer-events-auto"
                        : "-z-50 opacity-0 pointer-events-none"
                }`}
            >
                <button
                    type="button"
                    onClick={() =>
                        setLightboxOpen(
                            false,
                        )
                    }
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-gray-400 hover:bg-gray-500 rounded-full text-white transition z-10 cursor-pointer shadow-sm"
                >
                    <FiX
                        size={24}
                    />
                </button>

                <div className="flex-1 w-full max-w-5xl flex items-center justify-center relative mb-6 overflow-hidden">
                    {hasMultipleImages ? (
                        <Carousel
                            ref={
                                lightboxCarouselRef
                            }
                            responsive={
                                mainResponsive
                            }
                            infinite
                            customLeftArrow={
                                <CustomLeftArrow />
                            }
                            customRightArrow={
                                <CustomRightArrow />
                            }
                            afterChange={(
                                _previous: number,
                                state: any,
                            ) =>
                                setLightboxImage(
                                    (
                                        state.currentSlide -
                                        2 +
                                        images.length
                                    ) %
                                        images.length,
                                )
                            }
                            itemClass="flex items-center justify-center h-full w-full"
                            containerClass="h-full w-full"
                            sliderClass="h-full"
                        >
                            {images.map(
                                (
                                    src,
                                    index,
                                ) => (
                                    <div
                                        className="w-full h-full relative flex items-center justify-center"
                                        key={`${src}-${index}`}
                                    >
                                        <img
                                            src={src}
                                            loading="lazy"
                                            className="max-w-full max-h-full object-contain"
                                            alt={`Enlarged product ${index + 1}`}
                                            onError={(
                                                event,
                                            ) => {
                                                event.currentTarget.src =
                                                    PLACEHOLDER;
                                            }}
                                        />
                                    </div>
                                ),
                            )}
                        </Carousel>
                    ) : (
                        <img
                            src={images[0]}
                            loading="lazy"
                            className="max-w-full max-h-full object-contain"
                            alt={
                                (product as any)
                                    ?.title
                            }
                            onError={(
                                event,
                            ) => {
                                event.currentTarget.src =
                                    PLACEHOLDER;
                            }}
                        />
                    )}
                </div>

                {hasMultipleImages ? (
                    <div className="h-20 md:h-24 max-w-2xl w-full flex justify-center gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-none">
                        {images.map(
                            (
                                src,
                                index,
                            ) => (
                                <button
                                    type="button"
                                    key={`${src}-${index}`}
                                    onClick={() => {
                                        setLightboxImage(
                                            index,
                                        );

                                        lightboxCarouselRef
                                            .current
                                            ?.goToSlide?.(
                                                index + 2,
                                            );
                                    }}
                                    className={`h-full aspect-3/4 shrink-0 cursor-pointer border-2 transition-all ${
                                        index ===
                                        lightboxImage
                                            ? "border-black"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    }`}
                                >
                                    <img
                                        src={src}
                                        className="w-full h-full object-cover bg-gray-50"
                                        alt={`Thumb ${index + 1}`}
                                        onError={(
                                            event,
                                        ) => {
                                            event.currentTarget.src =
                                                PLACEHOLDER;
                                        }}
                                    />
                                </button>
                            ),
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProductDetails;