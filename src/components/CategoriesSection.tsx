import useEmblaCarousel from "embla-carousel-react";
import Wrapper from "./Wrapper";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { Category } from "../Models/Category";
import type { Product } from "../Models/Product";

const normalizeText = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const imageFromValue = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.image_url || value.secure_url || value.url || "").trim();
};

const parseImages = (value: any) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
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

const productImage = (product: any) => {
  const images = parseImages(product?.images);
  return (
    imageFromValue(product?.frontImageUrl) ||
    imageFromValue(product?.front_image_url) ||
    imageFromValue(product?.imageUrl) ||
    imageFromValue(product?.image_url) ||
    imageFromValue(product?.mainImageUrl) ||
    imageFromValue(product?.main_image_url) ||
    imageFromValue(images[0])
  );
};

const isGoodImage = (value: any) => {
  const image = String(value || "").trim().toLowerCase();
  if (!image) return false;
  if (image.includes("bewakoof.com")) return false;
  if (image.includes("undefined")) return false;
  if (image.includes("null")) return false;
  if (image === "[object object]") return false;
  return true;
};

const productMatchesCategory = (product: any, category: Category) => {
  const categoryId = String(category.id || "");
  const productCategoryId = String(product?.categoryId || product?.category_id || "");
  if (categoryId && productCategoryId && categoryId === productCategoryId) return true;

  const categoryName = normalizeText(category.name);
  const productName = normalizeText(product?.title || product?.name || product?.product_name || "");
  const productDescription = normalizeText(product?.description || "");
  const productText = `${productName} ${productDescription}`;

  if (!categoryName || !productText.trim()) return false;

  if (categoryName === "night dresses") {
    return productText.includes("night dress") || productText.includes("nightwear") || productText.includes("sleepwear");
  }

  if (categoryName === "t shirts") {
    return productText.includes("t shirt") || productText.includes("tshirt") || productText.includes("tee");
  }

  if (categoryName === "full sleeves t shirts") {
    return productText.includes("full sleeve") || productText.includes("full sleeves");
  }

  if (categoryName === "oversized t shirts") {
    return productText.includes("oversized") && (productText.includes("t shirt") || productText.includes("tshirt") || productText.includes("tee"));
  }

  if (categoryName === "pants") {
    return productText.includes("pant") || productText.includes("trouser");
  }

  if (categoryName === "track pants") {
    return productText.includes("track pant");
  }

  if (categoryName === "joggers") {
    return productText.includes("jogger");
  }

  if (categoryName === "jeans") {
    return productText.includes("jean") || productText.includes("denim");
  }

  if (categoryName === "shirts") {
    return productText.includes("shirt") && !productText.includes("t shirt") && !productText.includes("tshirt");
  }

  if (categoryName === "shorts") {
    return productText.includes("short");
  }

  if (categoryName === "vests") {
    return productText.includes("vest");
  }

  if (categoryName === "pyjamas") {
    return productText.includes("pyjama") || productText.includes("pajama");
  }

  return productText.includes(categoryName.replace(/s$/, ""));
};

const stableIndex = (key: string, length: number) => {
  if (!length) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % length;
};

const getCategoryParam = (name: string) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

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
      "(min-width: 1024px)": { active: false },
    },
  });

  const allProductImages = productData
    .map((product) => productImage(product))
    .filter(isGoodImage);

  const getCategoryImage = (category: Category) => {
    const matchingProducts = productData.filter((product) => productMatchesCategory(product, category));
    const matchingImages = matchingProducts.map((product) => productImage(product)).filter(isGoodImage);

    if (matchingImages.length) {
      return matchingImages[stableIndex(String(category.id || category.name), matchingImages.length)];
    }

    if (allProductImages.length) {
      return allProductImages[stableIndex(String(category.id || category.name), allProductImages.length)];
    }

    if (isGoodImage(category.image)) return category.image;

    return "/placeholder.svg";
  };

  return (
    <div className="w-full bg-white pt-6 md:pt-10 md:py-16 px-2 md:px-6">
      <Wrapper className="px-0!">
        {title && (
          <div className="text-left mb-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black font-big-shoulders uppercase">
              {title}
              <span className="text-[#FFD700]">.</span>
            </h2>
          </div>
        )}

        <div className="overflow-hidden md:overflow-visible" ref={emblaRef}>
          <div className="flex flex-col flex-wrap h-[440px] lg:h-auto lg:flex-row lg:grid lg:grid-cols-5 gap-2 lg:gap-4">
            {categories.map((category) => {
              const catParam = getCategoryParam(category.name);
              const image = getCategoryImage(category);

              return (
                <Link
                  key={category.id}
                  to={`/collections?category=${encodeURIComponent(catParam)}`}
                  className="flex-[0_0_48%] lg:flex-none relative group cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl shadow-xl aspect-3/4 block"
                >
                  <img
                    src={image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(event) => {
                      event.currentTarget.src = "/placeholder.svg";
                    }}
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent"></div>

                  <div className="absolute bottom-4 left-4 flex items-center justify-between w-[calc(100%-2rem)] gap-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-white tracking-tight uppercase font-big-shoulders opacity-90 wrap-break-word">
                      {category.name}
                    </h3>

                    <button className="shrink-0 flex items-center justify-center h-8 w-8 md:h-10 md:w-10 bg-white/20 rounded-full">
                      <ChevronRight
                        size={18}
                        className="text-white transform group-hover:-rotate-40 transition-transform"
                      />
                    </button>
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