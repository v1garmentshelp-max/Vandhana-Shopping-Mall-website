import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FiHeart, FiTrash2 } from "react-icons/fi";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type WishlistItem = {
  id: number | string;
  product_id: number | string;
  variant_id?: number | string | null;
  actual_product_id?: number | string | null;
  product_name: string;
  brand: string;
  gender?: string | null;
  size?: string | null;
  color?: string | null;
  colour?: string | null;
  original_price_b2c?: number | string | null;
  final_price_b2c?: number | string | null;
  original_price_b2b?: number | string | null;
  final_price_b2b?: number | string | null;
  image_url?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  main_image_url?: string | null;
  ean_code?: string | null;
};

const getStoredUser = (): StoredUser | null => {
  const raw =
    localStorage.getItem("user") || sessionStorage.getItem("user") || null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getWishlistKey = (userId: number) => `wishlist_variant_ids_${userId}`;

const readWishlistIds = (userId: number): number[] => {
  try {
    const raw =
      localStorage.getItem(getWishlistKey(userId)) ||
      localStorage.getItem(`wishlist_product_ids_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

const writeWishlistIds = (userId: number, ids: number[]) => {
  localStorage.setItem(getWishlistKey(userId), JSON.stringify(ids));
  localStorage.setItem(`wishlist_product_ids_${userId}`, JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-updated"));
};

const toNumberId = (value: any) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const getVariantId = (item: WishlistItem) => {
  return toNumberId(item.variant_id) || toNumberId(item.product_id) || toNumberId(item.id);
};

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
};

const getWishlistImage = (product: WishlistItem) => {
  return (
    product.front_image_url ||
    product.image_url ||
    product.main_image_url ||
    product.back_image_url ||
    "https://via.placeholder.com/500x700?text=Product"
  );
};

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const user = getStoredUser();
  const userId = Number(user?.id || 0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void loadWishlist(userId);
  }, [userId]);

  const loadWishlist = async (uid: number) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/wishlist/${uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.message || "Unable to load wishlist");
      }

      const list = Array.isArray(data) ? data : [];
      setItems(list);

      const ids = list
        .map((item: WishlistItem) => getVariantId(item))
        .filter(Boolean) as number[];

      writeWishlistIds(uid, ids);
    } catch (err: any) {
      setError(err?.message || "Unable to load wishlist");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: WishlistItem) => {
    const variantId = getVariantId(item);

    if (!userId) {
      navigate("/auth");
      return;
    }

    if (!variantId) {
      setError("Unable to remove item because variant id is missing");
      return;
    }

    setRemovingId(variantId);

    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          product_id: variantId,
          variant_id: variantId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Unable to remove item");
      }

      setItems((prev) => prev.filter((row) => getVariantId(row) !== variantId));
      const nextIds = readWishlistIds(userId).filter((id) => id !== variantId);
      writeWishlistIds(userId, nextIds);
    } catch (err: any) {
      setError(err?.message || "Unable to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 pt-10 pb-20 font-montserrat">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiHeart size={32} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
              Please login to view your wishlist
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Login or create an account to save your favorite products.
            </p>
            <Link
              to="/auth"
              className="inline-flex py-4 px-10 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-[1.02] transition-transform"
            >
              Login / Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20 font-montserrat">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
            My Wishlist{" "}
            <span className="text-black font-semibold">({items.length})</span>
          </h1>
        </div>

        {error ? (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 font-medium">Loading wishlist...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
              {items.map((product) => {
                const variantId = getVariantId(product);

                return (
                  <div
                    key={String(variantId || product.id)}
                    className="relative bg-white border border-gray-100 rounded-xl overflow-hidden group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemove(product)}
                      disabled={removingId === variantId}
                      className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <FiTrash2 size={18} />
                    </button>

                    <Link
                      to={`/product/${encodeURIComponent(String(variantId || product.id))}`}
                      className="block"
                    >
                      <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                        <img
                          src={getWishlistImage(product)}
                          alt={product.product_name}
                          className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      </div>

                      <div className="p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                          {product.brand || "Brand"}
                        </p>
                        <h3 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[42px]">
                          {product.product_name}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                          {product.size ? `Size: ${product.size}` : ""}
                          {product.size && (product.color || product.colour) ? " | " : ""}
                          {product.color || product.colour ? `Color: ${product.color || product.colour}` : ""}
                        </p>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span className="text-[16px] font-bold text-gray-900">
                            {formatCurrency(product.final_price_b2c)}
                          </span>
                          {Number(product.original_price_b2c || 0) >
                          Number(product.final_price_b2c || 0) ? (
                            <span className="text-[13px] text-gray-400 line-through">
                              {formatCurrency(product.original_price_b2c)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiHeart size={32} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Save your favorite items here. Start browsing and hit the heart
              icon to add products to your wishlist.
            </p>
            <Link
              to="/collections"
              className="inline-flex py-4 px-10 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-[1.02] transition-transform"
            >
              Discover Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}