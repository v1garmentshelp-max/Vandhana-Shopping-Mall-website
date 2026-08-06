import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Link } from "react-router";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";
import { fetchBranchProducts } from "../services/productsApi";

const clean = (value: any) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value: any) =>
  clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[./_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getProductKey = (product: Product, index = 0) =>
  clean(
    product.designCode ||
      product.design_code ||
      product.routeKey ||
      product.route_key ||
      product.groupKey ||
      product.group_key ||
      product.productId ||
      product.product_id ||
      product.id ||
      `product-${index}`,
  );

const getProductRoute = (product: Product) =>
  encodeURIComponent(getProductKey(product));

const getImageUrl = (value: any) => {
  if (typeof value === "string") return clean(value);

  return clean(
    value?.image_url ||
      value?.imageUrl ||
      value?.secure_url ||
      value?.url ||
      "",
  );
};

const getProductImage = (product: Product) => {
  const values = [
    product.frontImageUrl,
    product.front_image_url,
    product.mainImageUrl,
    product.main_image_url,
    product.imageUrl,
    product.image_url,
    ...(Array.isArray(product.images) ? product.images : []),
  ];

  return values.map(getImageUrl).find(Boolean) || "/placeholder.svg";
};

const getCategoryName = (product: Product) => {
  const categoryId = clean(product.categoryId || product.category_id);
  const category = (categories as any[]).find(
    (item) => clean(item?.id) === categoryId,
  );

  return clean(
    product.categoryName ||
      product.category_name ||
      product.categoryPath ||
      product.category_path ||
      category?.name ||
      "",
  );
};

const getVariantSearchText = (product: Product) =>
  (Array.isArray(product.variants) ? product.variants : [])
    .flatMap((variant: any) => [
      variant?.size,
      variant?.colour,
      variant?.color,
      variant?.barcode,
      variant?.ean_code,
      variant?.eanCode,
      variant?.designCode,
      variant?.design_code,
      variant?.patternType,
      variant?.pattern_type,
    ])
    .filter(Boolean)
    .join(" ");

const getSearchText = (product: Product) =>
  normalize(
    [
      product.title,
      product.name,
      product.product_name,
      product.description,
      product.brand,
      product.brand_name,
      product.gender,
      getCategoryName(product),
      product.categorySlug,
      product.category_slug,
      product.designCode,
      product.design_code,
      product.patternType,
      product.pattern_type,
      product.patternCode,
      product.pattern_code,
      product.barcode,
      product.ean_code,
      product.eanCode,
      ...(Array.isArray(product.colors) ? product.colors : []),
      ...(Array.isArray(product.colours) ? product.colours : []),
      ...(Array.isArray(product.sizes) ? product.sizes : []),
      ...(Array.isArray(product.barcodes) ? product.barcodes : []),
      getVariantSearchText(product),
    ]
      .filter(Boolean)
      .join(" "),
  );

const dedupeProducts = (products: Product[]) => {
  const map = new Map<string, Product>();

  products.forEach((product, index) => {
    const key = getProductKey(product, index);

    if (!map.has(key)) {
      map.set(key, product);
    }
  });

  return Array.from(map.values());
};

const getProductIdentityValues = (product: Product) =>
  Array.from(
    new Set(
      [
        getProductKey(product),
        product.designCode,
        product.design_code,
        product.routeKey,
        product.route_key,
        product.productId,
        product.product_id,
        product.id,
        product.variantId,
        product.variant_id,
        product.primaryVariantId,
        product.primary_variant_id,
        product.barcode,
        product.ean_code,
      ]
        .map(clean)
        .filter(Boolean),
    ),
  );

export const SearchOverlay = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    const loadProducts = async () => {
      setIsInitialLoading(true);

      try {
        const data = dedupeProducts(await fetchBranchProducts(3));

        if (!alive) return;

        setAllProducts(data);

        try {
          const stored = JSON.parse(
            localStorage.getItem("recentlyViewed") || "[]",
          );
          const ids = Array.isArray(stored)
            ? stored.map(clean).filter(Boolean)
            : [];

          const getPosition = (product: Product) => {
            const positions = getProductIdentityValues(product)
              .map((value) => ids.indexOf(value))
              .filter((position) => position >= 0);

            return positions.length ? Math.min(...positions) : -1;
          };

          const recent = data
            .filter((product) => getPosition(product) >= 0)
            .sort((a, b) => getPosition(a) - getPosition(b));

          setRecentProducts(recent.slice(0, 8));
        } catch {
          setRecentProducts([]);
        }
      } catch {
        if (!alive) return;

        setAllProducts([]);
        setRecentProducts([]);
      } finally {
        if (alive) setIsInitialLoading(false);
      }
    };

    void loadProducts();

    return () => {
      alive = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      const focusTimer = window.setTimeout(
        () => inputRef.current?.focus(),
        100,
      );
      document.body.style.overflow = "hidden";

      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
      };
    }

    setQuery("");
    setResults([]);
    document.body.style.overflow = previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const normalizedQuery = normalize(query);

    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const debounce = window.setTimeout(() => {
      const terms = normalizedQuery.split(" ").filter(Boolean);
      const filtered = allProducts.filter((product) => {
        const searchText = getSearchText(product);
        return terms.every((term) => searchText.includes(term));
      });

      setResults(filtered.slice(0, 8));
      setIsLoading(false);
    }, 250);

    return () => window.clearTimeout(debounce);
  }, [query, allProducts]);

  const normalizedQuery = useMemo(() => normalize(query), [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-300 flex items-start justify-center p-0 md:p-6 md:pt-14 transition-all font-poppins">
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-label="Close search"
      />

      <div className="relative w-full max-w-4xl bg-white h-full md:h-auto md:max-h-[80vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 py-3 md:pt-3 px-3 md:px-6 border-b border-gray-100 md:mt-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 md:hidden hover:bg-gray-100 cursor-pointer rounded-full transition-colors shrink-0"
            aria-label="Close search"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>

          <input
            ref={inputRef}
            type="search"
            className="flex-1 text-lg font-medium outline-none placeholder:text-gray-500 bg-transparent min-w-0"
            placeholder="Search products, colours or patterns..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X size={20} className="text-gray-400" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="p-2 hidden md:block hover:bg-gray-100 cursor-pointer rounded-full transition-colors shrink-0"
            aria-label="Close search"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scrollbar-hide">
          {isInitialLoading ? (
            <div className="w-full py-4">
              <ProductGridSkeleton />
            </div>
          ) : normalizedQuery.length >= 2 ? (
            isLoading ? (
              <div className="w-full py-4">
                <ProductGridSkeleton />
              </div>
            ) : results.length ? (
              <ProductGrid products={results} onClose={onClose} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No products found for &quot;{query}&quot;
                </p>
              </div>
            )
          ) : recentProducts.length ? (
            <>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                Recently Viewed
              </h3>
              <ProductGrid products={recentProducts} onClose={onClose} />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Start typing to search products
              </p>
            </div>
          )}
        </div>

        {normalizedQuery.length > 2 ? (
          <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
            <Link
              to={`/collections?search=${encodeURIComponent(query.trim())}`}
              className="text-sm font-semibold text-black hover:underline"
              onClick={onClose}
            >
              View all products
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ProductGrid = ({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 gap-y-3">
    {products.map((product, index) => {
      const originalPrice = Number(
        product.originalPrice || product.original_price || product.mrp || 0,
      );
      const price = Number(product.price || 0);
      const discount =
        originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;

      return (
        <Link
          key={getProductKey(product, index)}
          to={`/product/${getProductRoute(product)}`}
          onClick={onClose}
          className="group flex flex-col"
        >
          <div className="aspect-3/4 rounded-xl overflow-hidden bg-gray-50 mb-1">
            <img
              src={getProductImage(product)}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide line-clamp-1">
            {product.brand || product.brand_name || ""}
          </p>
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-accent-copper transition-colors">
            {product.title}
          </h4>
          <div className="flex items-center gap-2 font-source-sans flex-wrap">
            <span className="text-base font-bold text-gray-900">
              ₹{price}
            </span>
            {originalPrice > price ? (
              <span className="text-xs text-gray-400 line-through">
                ₹{originalPrice}
              </span>
            ) : null}
            {discount > 0 ? (
              <span className="text-xs font-bold text-green-600 tracking-tight">
                {discount}% OFF
              </span>
            ) : null}
          </div>
          {product.patternType || product.pattern_type ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 line-clamp-1">
              {product.patternType || product.pattern_type}
            </p>
          ) : null}
        </Link>
      );
    })}
  </div>
);

const ProductGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="flex flex-col animate-pulse">
        <div className="aspect-3/4 rounded-xl overflow-hidden bg-gray-200 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    ))}
  </div>
);
