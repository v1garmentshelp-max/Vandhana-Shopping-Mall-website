import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router";
import type { Product } from "../Models/Product";
import { Heart } from "lucide-react";

const API_BASE =
  "https://vandhana-shopping-mall-backend.vercel.app";

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1200' viewBox='0 0 900 1200'%3E%3Crect width='900' height='1200' fill='%23f3f4f6'/%3E%3Cpath d='M315 540h270v120H315z' fill='%23e5e7eb'/%3E%3C/svg%3E";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

const getStoredUser =
  (): StoredUser | null => {
    const raw =
      localStorage.getItem(
        "user",
      ) ||
      sessionStorage.getItem(
        "user",
      );

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

const toPositiveNumber = (
  value: any,
) => {
  const parsed = Number(
    String(
      value || "",
    ).trim(),
  );

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
};

const getWishlistKey = (
  userId: number,
) =>
  `wishlist_variant_ids_${userId}`;

const readWishlistIds = (
  userId: number,
): number[] => {
  try {
    const raw =
      localStorage.getItem(
        getWishlistKey(userId),
      ) ||
      localStorage.getItem(
        `wishlist_product_ids_${userId}`,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
          .map(Number)
          .filter(
            Number.isFinite,
          )
      : [];
  } catch {
    return [];
  }
};

const writeWishlistIds = (
  userId: number,
  ids: number[],
) => {
  localStorage.setItem(
    getWishlistKey(userId),
    JSON.stringify(ids),
  );

  localStorage.setItem(
    `wishlist_product_ids_${userId}`,
    JSON.stringify(ids),
  );

  window.dispatchEvent(
    new Event(
      "wishlist-updated",
    ),
  );
};

const cleanText = (value: any) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (
  value: any,
) =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[./_-]+/g, " ")
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value: any) =>
  cleanText(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 2 &&
      /^[a-z]+$/.test(word)
        ? word.toUpperCase()
        : word
            .charAt(0)
            .toUpperCase() +
          word.slice(1),
    )
    .join(" ");

const removeStartToken = (
  source: string,
  token: any,
) => {
  const raw =
    cleanText(source);

  const cleanToken =
    cleanText(token);

  if (
    !raw ||
    !cleanToken ||
    !normalizeText(
      raw,
    ).startsWith(
      normalizeText(
        cleanToken,
      ),
    )
  ) {
    return raw;
  }

  return cleanText(
    raw
      .split(" ")
      .slice(
        cleanToken
          .split(" ")
          .filter(Boolean)
          .length,
      )
      .join(" "),
  );
};

const commonColorWords = [
  "black",
  "white",
  "h white",
  "off white",
  "cream",
  "beige",
  "brown",
  "green",
  "b green",
  "blue",
  "sky blue",
  "sea blue",
  "ice blue",
  "navy",
  "grey",
  "gray",
  "d grey",
  "dark grey",
  "dark gray",
  "charcoal",
  "lavender",
  "pink",
  "red",
  "maroon",
  "yellow",
  "mustard",
  "orange",
  "purple",
  "tint",
  "olive",
  "khaki",
];

const removeColorPrefix = (
  source: string,
  colorValue: any,
) => {
  let next =
    cleanText(source);

  const color =
    cleanText(colorValue);

  if (color) {
    for (const part of [
      color,
      color.replace(/\./g, " "),
      color.replace(/\//g, " "),
      color.replace(/-/g, " "),
    ]) {
      const before = next;

      next = removeStartToken(
        next,
        part,
      );

      if (before !== next) {
        return next;
      }
    }
  }

  for (
    const colorWord of
    commonColorWords
  ) {
    const before = next;

    next = removeStartToken(
      next,
      colorWord,
    );

    if (before !== next) {
      return next;
    }
  }

  return next;
};

const cleanDisplayTitle = (
  props: any,
) => {
  const rawTitle = cleanText(
    props.title ||
      props.name ||
      props.product_name ||
      props.productName ||
      "Product",
  );

  const brand = cleanText(
    props.brand ||
      props.brand_name ||
      props.brandName,
  );

  const color = cleanText(
    props.colour ||
      props.color ||
      props.selectedColour ||
      props.selectedColor ||
      props.selected_colour ||
      props.selected_color,
  );

  const categoryName =
    cleanText(
      props.categoryName ||
        props.category_name ||
        "",
    );

  let title = rawTitle
    .replace(/['’]/g, "'")
    .replace(
      /\bmen's\b/gi,
      "MENS",
    )
    .replace(
      /\bwomen's\b/gi,
      "WOMENS",
    )
    .replace(/\s+/g, " ")
    .trim();

  title = removeStartToken(
    title,
    brand,
  );

  for (const token of [
    "MENS",
    "MEN",
    "WOMENS",
    "WOMEN",
    "LADIES",
    "KIDS",
    "BOYS",
    "GIRLS",
  ]) {
    title = removeStartToken(
      title,
      token,
    );
  }

  title = removeColorPrefix(
    title,
    color,
  );

  if (
    normalizeText(
      title,
    ).length <= 2 &&
    categoryName
  ) {
    title = categoryName;
  }

  if (!title) {
    title =
      categoryName ||
      rawTitle ||
      "Product";
  }

  return toTitleCase(title);
};

const cleanDisplayBrand = (
  value: any,
) =>
  cleanText(
    value || "Vandhana",
  ).toUpperCase();

const formatPrice = (value: any) => {
  const number = Number(
    value || 0,
  );

  return Number.isFinite(number)
    ? number.toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 0,
        },
      )
    : "0";
};

const parseImages = (
  value: any,
): any[] => {
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
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const getImageString = (
  value: any,
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }

  return String(
    value.image_url ||
      value.secure_url ||
      value.url ||
      value.imageUrl ||
      "",
  ).trim();
};

const getImageType = (
  value: any,
) => {
  if (
    !value ||
    typeof value ===
      "string"
  ) {
    return "";
  }

  return normalizeText(
    value.image_type ||
      value.imageType ||
      value.type ||
      value.label ||
      value.name ||
      value.view ||
      value.position,
  );
};

const isBadImage = (
  value: any,
) => {
  const image = String(
    value || "",
  )
    .trim()
    .toLowerCase();

  return (
    !image ||
    image ===
      "[object object]" ||
    image.includes(
      "undefined",
    ) ||
    image.includes("null") ||
    image.includes(
      "placeholder.svg",
    )
  );
};

const sameImage = (
  first: any,
  second: any,
) => {
  const firstImage = String(
    first || "",
  )
    .trim()
    .toLowerCase();

  const secondImage = String(
    second || "",
  )
    .trim()
    .toLowerCase();

  return Boolean(
    firstImage &&
      secondImage &&
      firstImage ===
        secondImage,
  );
};

const firstValidImage = (
  values: any[],
) => {
  for (const value of values) {
    const image =
      getImageString(value);

    if (!isBadImage(image)) {
      return image;
    }
  }

  return "";
};

const findImageByTypes = (
  images: any[],
  types: string[],
) => {
  const targets =
    types.map(normalizeText);

  for (
    const imageRecord of
    images
  ) {
    const type =
      getImageType(
        imageRecord,
      );

    if (
      !targets.some(
        (target) =>
          type === target ||
          type.includes(target),
      )
    ) {
      continue;
    }

    const image =
      getImageString(
        imageRecord,
      );

    if (!isBadImage(image)) {
      return image;
    }
  }

  return "";
};

export const ProductCardSkeleton:
  React.FC = () => (
  <div className="w-full max-w-[400px] block animate-pulse">
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-200" />

    <div className="mt-3 min-h-[86px] space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/5" />
      <div className="h-6 bg-gray-200 rounded w-4/5" />
      <div className="h-6 bg-gray-200 rounded w-1/3 mt-3" />
    </div>
  </div>
);

export const ProductCard:
  React.FC<Product> = (
  props: any,
) => {
  const {
    id,
    productId,
    product_id,
    designKey,
    design_key,
    routeKey,
    route_key,
    variantId,
    variant_id,
    primaryVariantId,
    primary_variant_id,
    images,
    title,
    brand,
    price,
    originalPrice,
    isSale,
    frontImageUrl,
    front_image_url,
    backImageUrl,
    back_image_url,
    mainImageUrl,
    main_image_url,
    imageUrl,
    image_url,
  } = props;

  const navigate =
    useNavigate();

  const [
    frontFailed,
    setFrontFailed,
  ] = useState(false);

  const [
    backFailed,
    setBackFailed,
  ] = useState(false);

  const [
    isWishlisted,
    setIsWishlisted,
  ] = useState(false);

  const [
    isUpdatingWishlist,
    setIsUpdatingWishlist,
  ] = useState(false);

  const displayTitle =
    useMemo(
      () =>
        cleanDisplayTitle(
          props,
        ),
      [props],
    );

  const displayBrand =
    useMemo(
      () =>
        cleanDisplayBrand(
          brand ||
            props.brand_name ||
            props.brandName,
        ),
      [
        brand,
        props.brand_name,
        props.brandName,
      ],
    );

  const resolvedImages =
    useMemo(() => {
      const imageList =
        parseImages(images);

      const typedFront =
        findImageByTypes(
          imageList,
          [
            "front",
            "primary",
            "main",
            "default",
          ],
        );

      const typedBack =
        findImageByTypes(
          imageList,
          [
            "back",
            "rear",
            "reverse",
          ],
        );

      const untypedFront =
        firstValidImage(
          imageList.filter(
            (image) =>
              !getImageType(image),
          ),
        );

      const front =
        firstValidImage([
          frontImageUrl,
          front_image_url,
          typedFront,
          mainImageUrl,
          main_image_url,
          imageUrl,
          image_url,
          untypedFront,
          ...imageList,
        ]) || FALLBACK_IMAGE;

      const back =
        firstValidImage([
          backImageUrl,
          back_image_url,
          typedBack,
        ]);

      return {
        front,
        back:
          back &&
          !sameImage(
            back,
            front,
          )
            ? back
            : "",
      };
    }, [
      images,
      frontImageUrl,
      front_image_url,
      backImageUrl,
      back_image_url,
      mainImageUrl,
      main_image_url,
      imageUrl,
      image_url,
    ]);

  const finalVariantId =
    variantId ||
    variant_id ||
    primaryVariantId ||
    primary_variant_id;

  const wishlistVariantId =
    useMemo(
      () =>
        toPositiveNumber(
          finalVariantId,
        ) ||
        toPositiveNumber(id),
      [finalVariantId, id],
    );

  const parentProductId =
    useMemo(
      () =>
        toPositiveNumber(
          productId ||
            product_id,
        ) ||
        toPositiveNumber(id),
      [
        productId,
        product_id,
        id,
      ],
    );

  const productRoute =
    useMemo(() => {
      const routeProductId =
        cleanText(
          routeKey ||
            route_key ||
            designKey ||
            design_key ||
            productId ||
            product_id ||
            id,
        );

      const routeVariantId =
        cleanText(
          finalVariantId,
        );

      const baseRoute =
        `/product/${encodeURIComponent(routeProductId)}`;

      return routeVariantId
        ? `${baseRoute}?variant_id=${encodeURIComponent(routeVariantId)}`
        : baseRoute;
    }, [
      routeKey,
      route_key,
      designKey,
      design_key,
      productId,
      product_id,
      finalVariantId,
      id,
    ]);

  const finalPrice = Number(
    price || 0,
  );

  const finalOriginalPrice =
    Number(
      originalPrice ||
        props.original_price ||
        props.mrp ||
        0,
    );

  const discount =
    finalOriginalPrice >
    finalPrice
      ? Math.round(
          ((finalOriginalPrice -
            finalPrice) /
            finalOriginalPrice) *
            100,
        )
      : 0;

  const frontImg =
    frontFailed
      ? FALLBACK_IMAGE
      : resolvedImages.front ||
        FALLBACK_IMAGE;

  const backImg =
    !backFailed &&
    resolvedImages.back &&
    !sameImage(
      resolvedImages.back,
      frontImg,
    )
      ? resolvedImages.back
      : "";

  const hasBackImage =
    Boolean(backImg);

  useEffect(() => {
    setFrontFailed(false);
    setBackFailed(false);
  }, [
    resolvedImages.front,
    resolvedImages.back,
    finalVariantId,
    id,
  ]);

  useEffect(() => {
    const syncWishlistState =
      () => {
        const user =
          getStoredUser();

        const userId =
          Number(
            user?.id || 0,
          );

        if (
          !userId ||
          !wishlistVariantId
        ) {
          setIsWishlisted(
            false,
          );

          return;
        }

        setIsWishlisted(
          readWishlistIds(
            userId,
          ).includes(
            wishlistVariantId,
          ),
        );
      };

    syncWishlistState();

    window.addEventListener(
      "wishlist-updated",
      syncWishlistState,
    );

    return () =>
      window.removeEventListener(
        "wishlist-updated",
        syncWishlistState,
      );
  }, [wishlistVariantId]);

  const handleWishlistToggle =
    async (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => {
      event.preventDefault();
      event.stopPropagation();

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
        !wishlistVariantId ||
        isUpdatingWishlist
      ) {
        return;
      }

      setIsUpdatingWishlist(
        true,
      );

      try {
        const response =
          await fetch(
            `${API_BASE}/api/wishlist`,
            {
              method:
                isWishlisted
                  ? "DELETE"
                  : "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  user_id: userId,
                  product_id:
                    wishlistVariantId,
                  variant_id:
                    wishlistVariantId,
                  actual_product_id:
                    parentProductId,
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
          isWishlisted
            ? readWishlistIds(
                userId,
              ).filter(
                (item) =>
                  item !==
                  wishlistVariantId,
              )
            : Array.from(
                new Set([
                  ...readWishlistIds(
                    userId,
                  ),
                  wishlistVariantId,
                ]),
              );

        writeWishlistIds(
          userId,
          ids,
        );

        setIsWishlisted(
          !isWishlisted,
        );
      } catch (
        error: any
      ) {
        alert(
          error?.message ||
            "Wishlist update failed",
        );
      } finally {
        setIsUpdatingWishlist(
          false,
        );
      }
    };

  return (
    <Link
      to={productRoute}
      className={`w-full max-w-[400px] cursor-pointer block overflow-hidden ${
        hasBackImage
          ? "group"
          : ""
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
        {(isSale ||
          discount > 0) && (
          <div className="absolute top-0 left-3 z-20 bg-primary text-black px-3 py-0.5 h-[22px] flex items-center justify-center rounded-b-sm">
            <span className="font-big-shoulders font-bold text-[0.82rem] leading-none uppercase">
              Sale
            </span>
          </div>
        )}

        <img
          src={frontImg}
          alt={
            displayTitle ||
            title
          }
          loading="lazy"
          onError={() =>
            setFrontFailed(true)
          }
          className={`h-full w-full object-cover object-top transition-all duration-500 relative z-10 ${
            hasBackImage
              ? "group-hover:opacity-0 group-hover:scale-105"
              : ""
          }`}
        />

        {hasBackImage ? (
          <img
            src={backImg}
            alt={`${displayTitle || title} back`}
            loading="lazy"
            onError={() =>
              setBackFailed(true)
            }
            className="h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105 absolute inset-0 opacity-0 group-hover:opacity-100 z-10"
          />
        ) : null}

        <button
          type="button"
          onClick={
            handleWishlistToggle
          }
          disabled={
            isUpdatingWishlist
          }
          className="cursor-pointer hover:bg-gray-100 absolute bottom-3 right-3 z-40 bg-white rounded-full p-2.5 shadow-md transition-transform hover:scale-110 disabled:opacity-60"
        >
          <Heart
            size={18}
            className={
              isWishlisted
                ? "fill-red-500 text-red-500"
                : "text-black"
            }
          />
        </button>
      </div>

      <div className="mt-3 min-h-[86px] flex flex-col">
        <p className="text-[0.72rem] md:text-[0.78rem] font-extrabold tracking-wide text-gray-500 font-poppins uppercase truncate leading-tight">
          {displayBrand}
        </p>

        <h3
          aria-label={
            displayTitle
          }
          title={displayTitle}
          className="mt-1 text-[1.1rem] md:text-[1.2rem] font-bold tracking-tight text-black font-big-shoulders uppercase leading-[1.05] line-clamp-2 min-h-[2.35rem]"
        >
          {displayTitle}
        </h3>

        <div className="mt-auto pt-2 flex items-center font-source-sans gap-2 min-h-[32px] overflow-hidden">
          <span className="text-[1.15rem] md:text-[1.22rem] font-extrabold text-black whitespace-nowrap">
            ₹
            {formatPrice(
              finalPrice,
            )}
          </span>

          {finalOriginalPrice >
          finalPrice ? (
            <>
              <span className="text-[0.9rem] md:text-[1rem] font-medium text-gray-400 line-through whitespace-nowrap">
                ₹
                {formatPrice(
                  finalOriginalPrice,
                )}
              </span>

              <span className="text-[0.72rem] md:text-[0.78rem] font-extrabold text-green-600 tracking-tight whitespace-nowrap">
                {discount}% OFF
              </span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
};