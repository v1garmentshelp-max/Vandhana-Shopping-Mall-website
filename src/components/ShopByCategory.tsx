import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import Wrapper from "./Wrapper";
import KidsImage from "../assets/kids.jpeg";
import {
  fetchCategoriesByGender,
  type StorefrontCategory,
} from "../services/productsApi";

const CAT_IMAGES = {
  Men: "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555eb738d1f865fb32b1a_1.jpeg",
  Women:
    "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555e49a2cdcab119ad9b2_2.jpeg",
  Kids: KidsImage,
};

type Gender = "Men" | "Women" | "Kids";

type CategoriesState = Record<Gender, StorefrontCategory[]>;

interface CardProps {
  label: Gender;
  image: string;
  onSelect: (gender: Gender) => void;
  className?: string;
  aspectMobile?: string;
}

interface DynamicCategoryCardProps {
  category: StorefrontCategory;
  gender: Gender;
  fallbackImage: string;
  onSelect: (
    gender: Gender,
    category: StorefrontCategory,
  ) => void;
}

const CategoryCard: React.FC<CardProps> = ({
  label,
  image,
  onSelect,
  className = "",
  aspectMobile = "aspect-[1/2]",
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(label)}
      className={`relative group overflow-hidden rounded-3xl ${aspectMobile} md:aspect-4/5 shadow-2xl cursor-pointer text-left w-full ${className}`}
      aria-label={`Shop ${label} collection`}
    >
      <img
        src={image}
        alt={`${label} Collection`}
        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110"
      />

      <span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />

      <span className="absolute bottom-4 left-4 md:bottom-10 md:left-10">
        <span className="block text-3xl md:text-6xl font-black text-white font-big-shoulders tracking-normal uppercase">
          {label}
        </span>

        <span className="mt-1 md:mt-4 flex items-center gap-2 text-[#FFD700] font-poppins font-bold text-sm tracking-widest group/btn">
          {label === "Kids" ? "EXPLORE" : "SHOP NOW"}

          <ChevronRight
            size={18}
            className="transition-transform group-hover/btn:translate-x-2"
          />
        </span>
      </span>
    </button>
  );
};

const DynamicCategoryCard: React.FC<
  DynamicCategoryCardProps
> = ({
  category,
  gender,
  fallbackImage,
  onSelect,
}) => {
  const image =
    category.image &&
    category.image.trim().length > 0
      ? category.image
      : fallbackImage;

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(gender, category)
      }
      className="group w-full text-left cursor-pointer"
      aria-label={`Shop ${category.name}`}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={image}
          alt={category.name}
          loading="lazy"
          onError={(event) => {
            const target =
              event.currentTarget;

            if (
              target.src !==
              fallbackImage
            ) {
              target.src =
                fallbackImage;
            }
          }}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/5 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <div className="text-white font-big-shoulders font-bold uppercase text-xl md:text-2xl leading-tight">
            {category.name}
          </div>

          <div className="mt-2 inline-flex items-center gap-1 text-[#FFD700] text-xs font-poppins font-bold tracking-wider">
            SHOP NOW

            <ChevronRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </div>
        </div>
      </div>
    </button>
  );
};

const normalizeCategories = (
  categories: StorefrontCategory[],
) => {
  const map = new Map<
    string,
    StorefrontCategory
  >();

  categories.forEach((category) => {
    if (
      !category ||
      category.is_active === false ||
      category.selectable === false ||
      !category.name?.trim()
    ) {
      return;
    }

    const key =
      category.id ||
      category.slug ||
      category.name
        .trim()
        .toLowerCase();

    if (!map.has(key)) {
      map.set(key, category);
    }
  });

  return Array.from(
    map.values(),
  ).sort((a, b) => {
    const orderA =
      Number(a.sort_order) || 0;
    const orderB =
      Number(b.sort_order) || 0;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(
      b.name,
    );
  });
};

const ShopByCategory: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] =
    useState<CategoriesState>({
      Men: [],
      Women: [],
      Kids: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadCategories =
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            menCategories,
            womenCategories,
            kidsCategories,
          ] = await Promise.all([
            fetchCategoriesByGender(
              "Men",
            ),
            fetchCategoriesByGender(
              "Women",
            ),
            fetchCategoriesByGender(
              "Kids",
            ),
          ]);

          if (!active) {
            return;
          }

          setCategories({
            Men: normalizeCategories(
              menCategories,
            ),
            Women:
              normalizeCategories(
                womenCategories,
              ),
            Kids: normalizeCategories(
              kidsCategories,
            ),
          });
        } catch (err) {
          console.error(
            "Failed to load categories:",
            err,
          );

          if (active) {
            setError(
              "Unable to load categories.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const categorySections =
    useMemo(
      () =>
        (
          [
            "Men",
            "Women",
            "Kids",
          ] as Gender[]
        ).filter(
          (gender) =>
            categories[gender]
              .length > 0,
        ),
      [categories],
    );

  const handleGenderSelect = (
    gender: Gender,
  ) => {
    const path = `/${gender.toLowerCase()}`;

    localStorage.setItem(
      "preferred_gender",
      gender,
    );

    localStorage.setItem(
      "preferred_gender_url",
      path,
    );

    navigate(path);
  };

  const handleCategorySelect = (
    gender: Gender,
    category: StorefrontCategory,
  ) => {
    const basePath = `/${gender.toLowerCase()}`;

    const params =
      new URLSearchParams();

    if (category.id) {
      params.set(
        "categoryId",
        String(category.id),
      );
    }

    if (category.slug) {
      params.set(
        "category",
        category.slug,
      );
    }

    localStorage.setItem(
      "preferred_gender",
      gender,
    );

    localStorage.setItem(
      "preferred_gender_url",
      basePath,
    );

    localStorage.setItem(
      "preferred_category_id",
      String(category.id || ""),
    );

    localStorage.setItem(
      "preferred_category_slug",
      category.slug || "",
    );

    localStorage.setItem(
      "preferred_category_name",
      category.name || "",
    );

    navigate(
      `${basePath}?${params.toString()}`,
      {
        state: {
          categoryId:
            category.id,
          categorySlug:
            category.slug,
          categoryName:
            category.name,
          gender,
        },
      },
    );
  };

  return (
    <section className="w-full bg-white py-8 md:py-14">
      <Wrapper>
        <div className="mb-8 md:mb-12">
          <h2 className="font-big-shoulders text-4xl md:text-6xl font-black uppercase text-black">
            Shop by Category.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <CategoryCard
            label="Men"
            image={CAT_IMAGES.Men}
            onSelect={
              handleGenderSelect
            }
          />

          <CategoryCard
            label="Women"
            image={
              CAT_IMAGES.Women
            }
            onSelect={
              handleGenderSelect
            }
          />

          <CategoryCard
            label="Kids"
            image={CAT_IMAGES.Kids}
            onSelect={
              handleGenderSelect
            }
            className="col-span-2 md:col-span-1"
            aspectMobile="aspect-[3/4]"
          />
        </div>

        <div className="mt-14 md:mt-20">
          {loading && (
            <div className="py-12 text-center">
              <div className="text-sm font-poppins font-semibold uppercase tracking-wider text-gray-500">
                Loading
                categories...
              </div>
            </div>
          )}

          {!loading &&
            error && (
              <div className="py-10 text-center text-sm font-poppins text-gray-500">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            categorySections.map(
              (gender) => (
                <div
                  key={gender}
                  className="mb-14 md:mb-20 last:mb-0"
                >
                  <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
                    <div>
                      <p className="font-poppins text-xs md:text-sm font-bold tracking-[0.18em] uppercase text-gray-500">
                        Explore
                      </p>

                      <h3 className="font-big-shoulders text-3xl md:text-5xl font-black uppercase text-black leading-none mt-1">
                        {gender} Categories
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleGenderSelect(
                          gender,
                        )
                      }
                      className="hidden sm:flex items-center gap-1 font-poppins text-sm font-bold text-black hover:opacity-60 transition-opacity"
                    >
                      VIEW ALL
                      <ChevronRight
                        size={18}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {categories[
                      gender
                    ].map(
                      (category) => (
                        <DynamicCategoryCard
                          key={
                            category.id ||
                            `${gender}-${category.slug}`
                          }
                          category={
                            category
                          }
                          gender={
                            gender
                          }
                          fallbackImage={
                            CAT_IMAGES[
                              gender
                            ]
                          }
                          onSelect={
                            handleCategorySelect
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              ),
            )}
        </div>
      </Wrapper>
    </section>
  );
};

export default ShopByCategory;