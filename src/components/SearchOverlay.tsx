import { useState, useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";
import type { Product } from "../Models/Product";
import products from "../Data/Products.json";
import categories from "../Data/categories.json";

export const SearchOverlay = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Recent Products when overlay opens
  useEffect(() => {
    if (!isOpen) return;
    try {
      const recentlyViewedIds: string[] = JSON.parse(
        localStorage.getItem("recentlyViewed") || "[]",
      );
      const allProducts = products as unknown as Product[];
      const recent = allProducts.filter((p) =>
        recentlyViewedIds.includes(p.id),
      );

      // Sort to match recently viewed order exactly as they appear in history
      recent.sort(
        (a, b) =>
          recentlyViewedIds.indexOf(a.id) - recentlyViewedIds.indexOf(b.id),
      );

      setRecentProducts(recent.slice(0, 8));
    } catch {
      setRecentProducts([]);
    }
  }, [isOpen]);

  // Handle Focus and Scroll Lock
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Predictive Search with Loading State (Mocked)
  useEffect(() => {
    const search = () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // Simulate API call delay
      setTimeout(() => {
        const lowerQuery = query.toLowerCase();
        const filtered = (products as unknown as Product[]).filter((p) => {
          return (
            p.title?.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.brand?.toLowerCase().includes(lowerQuery) ||
            p.gender.toLowerCase().includes(lowerQuery) ||
            categories
              .find((c: any) => c.id === p.categoryId)
              ?.name.toLowerCase()
              .includes(lowerQuery)
          );
        });
        setResults(filtered.slice(0, 8));
        setIsLoading(false);
      }, 500);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-300 flex items-start justify-center p-0 md:p-6 md:pt-14 transition-all font-poppins">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white h-full md:h-auto md:max-h-[80vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Search Header */}
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

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scrollbar-hide">
          {/* Logic for Results vs. Recently Added */}
          {query.length >= 2 ? (
            <>
              {isLoading ? (
                <div className="w-full py-4">
                  <ProductGridSkeleton />
                </div>
              ) : results.length > 0 ? (
                <ProductGrid products={results} />
              ) : (
                !isLoading && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      No products found for "{query}"
                    </p>
                  </div>
                )
              )}
            </>
          ) : (
            recentProducts.length > 0 && (
              <ProductGrid products={recentProducts} />
            )
          )}
        </div>

        {/* Footer Link */}
        {query.length > 2 && (
          <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
            <a
              href={`/search?q=${query}`}
              className="text-sm font-semibold text-black hover:underline"
            >
              View all results for "{query}"
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductGrid = ({ products }: { products: Product[] }) => {
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
          return (
            <a
              key={product.title}
              href={`/product/${product.id}`}
              className="group flex flex-col"
            >
              <div className="aspect-3/4 rounded-xl overflow-hidden bg-gray-50 mb-1">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-accent-copper transition-colors">
                {product.title}
              </h4>
              <div className="flex items-center gap-2 font-source-sans">
                <span className="text-base font-bold text-gray-900">
                  ₹{product.price}
                </span>
                {product.originalPrice && (
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
