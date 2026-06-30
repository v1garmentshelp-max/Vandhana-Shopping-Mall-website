import { useState, useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";
import type { Product } from "../Models/Product";
import categories from "../Data/categories.json";
import { fetchBranchProducts } from "../services/productsApi";

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
        const data = await fetchBranchProducts(3);
        if (!alive) return;

        setAllProducts(data);

        try {
          const recentlyViewedIds: string[] = JSON.parse(
            localStorage.getItem("recentlyViewed") || "[]",
          );

          const recent = data.filter((p) =>
            recentlyViewedIds.includes(String(p.id)),
          );

          recent.sort(
            (a, b) =>
              recentlyViewedIds.indexOf(String(a.id)) -
              recentlyViewedIds.indexOf(String(b.id)),
          );

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
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setResults([]);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const search = () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      setTimeout(() => {
        const lowerQuery = query.toLowerCase().trim();

        const filtered = allProducts.filter((p) => {
          const categoryName =
            categories.find((c: any) => String(c.id) === String(p.categoryId))
              ?.name || "";

          return (
            p.title?.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.brand?.toLowerCase().includes(lowerQuery) ||
            p.gender?.toLowerCase().includes(lowerQuery) ||
            p.barcode?.toLowerCase().includes(lowerQuery) ||
            categoryName.toLowerCase().includes(lowerQuery)
          );
        });

        setResults(filtered.slice(0, 8));
        setIsLoading(false);
      }, 300);
    };

    const debounce = setTimeout(search, 250);
    return () => clearTimeout(debounce);
  }, [query, allProducts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-300 flex items-start justify-center p-0 md:p-6 md:pt-14 transition-all font-poppins">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white h-full md:h-auto md:max-h-[80vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 py-3 md:pt-3 px-3 md:px-6 border-b border-gray-100 md:mt-0">
          <button
            onClick={onClose}
            className="p-2 md:hidden hover:bg-gray-100 cursor-pointer rounded-full transition-colors shrink-0"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>

          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg font-medium outline-none placeholder:text-gray-500 bg-transparent min-w-0"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            onClick={onClose}
            className="p-2 hidden md:block hover:bg-gray-100 cursor-pointer rounded-full transition-colors shrink-0"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scrollbar-hide">
          {isInitialLoading ? (
            <div className="w-full py-4">
              <ProductGridSkeleton />
            </div>
          ) : query.length >= 2 ? (
            <>
              {isLoading ? (
                <div className="w-full py-4">
                  <ProductGridSkeleton />
                </div>
              ) : results.length > 0 ? (
                <ProductGrid products={results} onClose={onClose} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No products found for "{query}"
                  </p>
                </div>
              )}
            </>
          ) : recentProducts.length > 0 ? (
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

        {query.length > 2 && (
          <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
            <a
              href={`/collections`}
              className="text-sm font-semibold text-black hover:underline"
              onClick={onClose}
            >
              View all products
            </a>
          </div>
        )}
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
}) => {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 gap-y-3">
        {products.map((product) => {
          const discount =
            product.originalPrice && product.originalPrice > product.price
              ? Math.round(
                  ((product.originalPrice - product.price) /
                    product.originalPrice) *
                    100,
                )
              : 0;

          const image =
            Array.isArray(product.images) && product.images.length
              ? product.images[0]
              : "/placeholder.svg";

          return (
            <a
              key={`${product.id}-${product.barcode || ""}`}
              href={`/product/${encodeURIComponent(String(product.id))}`}
              onClick={onClose}
              className="group flex flex-col"
            >
              <div className="aspect-3/4 rounded-xl overflow-hidden bg-gray-50 mb-1">
                <img
                  src={image}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide line-clamp-1">
                {product.brand || ""}
              </p>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-accent-copper transition-colors">
                {product.title}
              </h4>
              <div className="flex items-center gap-2 font-source-sans flex-wrap">
                <span className="text-base font-bold text-gray-900">
                  ₹{product.price}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{product.originalPrice}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-xs font-bold text-green-600 tracking-tight">
                    {discount}% OFF
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const ProductGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex flex-col animate-pulse">
        <div className="aspect-3/4 rounded-xl overflow-hidden bg-gray-200 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    ))}
  </div>
);