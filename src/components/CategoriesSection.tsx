import { useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Wrapper from "./Wrapper";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { Category } from "../Models/Category";
import type { Product } from "../Models/Product";
import categoriesJson from "../Data/categories.json";

type CategoryRecord = {
  id: string | number;
  name?: string;
  slug?: string;
  image?: string;
  parentId?: string | number | null;
  parent_id?: string | number | null;
  level?: number;
  gender?: string;
  is_active?: boolean;
};

const categoryRecords = (categoriesJson as CategoryRecord[]).filter(
  (category) => category?.is_active !== false,
);

const normalizeCategoryId = (value: unknown) =>
  String(value ?? "").trim();

const getCategoryParentId = (category: CategoryRecord) =>
  normalizeCategoryId(
    category?.parentId !== undefined
      ? category.parentId
      : category?.parent_id,
  );

const imageFromValue = (value: any) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  return String(
    value.image_url ||
      value.imageUrl ||
      value.front_image_url ||
      value.frontImageUrl ||
      value.main_image_url ||
      value.mainImageUrl ||
      value.secure_url ||
      value.url ||
      "",
  ).trim();
};

const parseImages = (value: any) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return [];
};

const isGoodImage = (value: any) => {
  const image = String(value || "").trim().toLowerCase();

  return Boolean(
    image &&
      image !== "[object object]" &&
      !image.includes("undefined") &&
      !image.includes("null") &&
      !image.includes("placeholder.svg"),
  );
};

const uniqueImages = (values: any[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const image = imageFromValue(value);

    if (!isGoodImage(image)) return;

    const key = image.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    output.push(image);
  });

  return output;
};

const productImages = (product: any) => {
  const images = parseImages(product?.images);

  return uniqueImages([
    product?.frontImageUrl,
    product?.front_image_url,
    product?.imageUrl,
    product?.image_url,
    product?.mainImageUrl,
    product?.main_image_url,
    product?.backImageUrl,
    product?.back_image_url,
    ...images,
  ]);
};

const categoryImageMap = new Map<string, string>(
  categoryRecords.map((category) => [
    normalizeCategoryId(category.id),
    String(category.image || ""),
  ]),
);

const categoryRecordMap = new Map<string, CategoryRecord>(
  categoryRecords.map((category) => [
    normalizeCategoryId(category.id),
    category,
  ]),
);

const categoryChildrenMap = new Map<string, string[]>();

categoryRecords.forEach((category) => {
  const id = normalizeCategoryId(category.id);
  const parentId = getCategoryParentId(category);

  if (!id || !parentId) return;

  const children = categoryChildrenMap.get(parentId) || [];

  children.push(id);
  categoryChildrenMap.set(parentId, children);
});

const getDescendantCategoryIds = (categoryId: unknown) => {
  const rootId = normalizeCategoryId(categoryId);
  const categoryIds = new Set<string>();

  if (!rootId) {
    return categoryIds;
  }

  const pending = [rootId];

  while (pending.length) {
    const currentId = pending.shift();

    if (!currentId || categoryIds.has(currentId)) {
      continue;
    }

    categoryIds.add(currentId);

    const children = categoryChildrenMap.get(currentId) || [];

    children.forEach((childId) => {
      if (!categoryIds.has(childId)) {
        pending.push(childId);
      }
    });
  }

  return categoryIds;
};

const getProductCategoryId = (product: any) =>
  normalizeCategoryId(product?.categoryId || product?.category_id);

const getExactCategoryProducts = (
  category: any,
  productData: Product[],
) => {
  const categoryId = normalizeCategoryId(category?.id);

  if (!categoryId) return [];

  return productData.filter(
    (product: any) => getProductCategoryId(product) === categoryId,
  );
};

const getCategoryAndDescendantProducts = (
  category: any,
  productData: Product[],
) => {
  const categoryIds = getDescendantCategoryIds(category?.id);

  if (!categoryIds.size) return [];

  return productData.filter((product: any) =>
    categoryIds.has(getProductCategoryId(product)),
  );
};

const getCategoryImage = (
  category: any,
  productData: Product[],
) => {
  const exactProducts = getExactCategoryProducts(category, productData);

  for (const product of exactProducts) {
    const images = productImages(product);

    if (images.length) {
      return images[0];
    }
  }

  const descendantProducts = getCategoryAndDescendantProducts(
    category,
    productData,
  );

  for (const product of descendantProducts) {
    const images = productImages(product);

    if (images.length) {
      return images[0];
    }
  }

  const mappedImage = categoryImageMap.get(
    normalizeCategoryId(category?.id),
  );

  if (isGoodImage(mappedImage)) {
    return mappedImage as string;
  }

  if (isGoodImage(category?.image)) {
    return String(category.image);
  }

  return "/placeholder.svg";
};

const getGenderParam = (
  category: any,
  productData: Product[],
) => {
  const gender = String(category?.gender || "").toUpperCase();

  if (gender === "MEN") return "Men";
  if (gender === "WOMEN") return "Women";
  if (gender === "KIDS") return "Kids";

  const matchingProducts = getCategoryAndDescendantProducts(
    category,
    productData,
  );

  const matchedProduct = matchingProducts[0] as any;

  return String(
    matchedProduct?.gender || matchedProduct?.category || "",
  );
};

const getCategoryLink = (
  category: any,
  productData: Product[],
) => {
  const params = new URLSearchParams();
  const gender = getGenderParam(category, productData);
  const categoryId = normalizeCategoryId(category?.id);

  if (gender) {
    params.set("gender", gender);
  }

  if (categoryId) {
    params.set("category_id", categoryId);
  }

  return `/collections?${params.toString()}`;
};

const CategoriesSection = ({
  categories,
  title,
  productData = [],
}: {
  categories: Category[];
  title?: string;
  productData?: Product[];
}) => {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
    breakpoints: {
      "(min-width: 1024px)": {
        active: false,
      },
    },
  });

  const visibleCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).filter(
        (category: any) => {
          if (!category?.id || category?.is_active === false) {
            return false;
          }

          const configuredCategory = categoryRecordMap.get(
            normalizeCategoryId(category.id),
          );

          return configuredCategory?.is_active !== false;
        },
      ),
    [categories],
  );

  return (
    <div className="w-full bg-white pt-6 md:pt-10 md:py-16 px-2 md:px-6">
      <Wrapper className="px-0!">
        {title ? (
          <div className="text-left mb-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black font-big-shoulders uppercase">
              {title}
              <span className="text-[#FFD700]">.</span>
            </h2>
          </div>
        ) : null}

        <div
          className="overflow-hidden md:overflow-visible"
          ref={emblaRef}
        >
          <div className="flex flex-col flex-wrap h-[440px] lg:h-auto lg:flex-row lg:grid lg:grid-cols-5 gap-2 lg:gap-4">
            {visibleCategories.map((category: any) => {
              const categoryId = normalizeCategoryId(category.id);
              const image = getCategoryImage(category, productData);
              const fallbackImage =
                categoryImageMap.get(categoryId) || "/placeholder.svg";

              return (
                <Link
                  key={categoryId}
                  to={getCategoryLink(category, productData)}
                  className="flex-[0_0_48%] lg:flex-none relative group cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl shadow-xl aspect-3/4 block"
                >
                  <img
                    src={image}
                    alt={String(category.name || "")}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    onError={(event) => {
                      const imageElement = event.currentTarget;

                      if (imageElement.dataset.fallbackStage === "2") {
                        imageElement.onerror = null;
                        return;
                      }

                      if (
                        imageElement.dataset.fallbackStage !== "1" &&
                        isGoodImage(fallbackImage)
                      ) {
                        imageElement.dataset.fallbackStage = "1";
                        imageElement.src = fallbackImage;
                        return;
                      }

                      imageElement.dataset.fallbackStage = "2";
                      imageElement.src = "/placeholder.svg";
                    }}
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 flex items-center justify-between w-[calc(100%-2rem)] gap-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white tracking-tight uppercase font-big-shoulders opacity-90 wrap-break-word">
                      {category.name}
                    </h3>

                    <span className="shrink-0 flex items-center justify-center h-8 w-8 md:h-10 md:w-10 bg-white/20 rounded-full">
                      <ChevronRight
                        size={18}
                        className="text-white transform group-hover:-rotate-40 transition-transform"
                      />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default CategoriesSection;