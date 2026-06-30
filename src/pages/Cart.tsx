import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiArrowRight,
  FiX,
  FiChevronDown,
  FiTruck,
} from "react-icons/fi";
import { LuBadgePercent } from "react-icons/lu";
import {
  fetchCart,
  removeFromCart,
  updateCartQuantity,
  type CartApiItem,
} from "../services/cartApi";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type CartLine = {
  cartItemId?: number;
  id: string | number;
  productId?: string | number | null;
  variantId?: string | number | null;
  title: string;
  description: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  stock: number;
  isCustom?: boolean;
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

const parseImages = (value: any) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
};

const normalizeCartItem = (item: CartApiItem): CartLine => {
  const images = parseImages(item.images);
  const fallbackImage =
    item.front_image_url ||
    item.image_url ||
    item.main_image_url ||
    item.back_image_url ||
    "/placeholder.svg";

  return {
    cartItemId: item.cart_item_id,
    id: item.id || item.variant_id || item.product_id || item.cart_item_id || "",
    productId: item.product_id,
    variantId: item.variant_id || item.id,
    title: item.product_name || "Product",
    description: "",
    brand: item.brand || "",
    price: Number(item.final_price_b2c || 0),
    originalPrice: Number(item.original_price_b2c || 0) || undefined,
    images: images.length ? images : [fallbackImage],
    quantity: Math.max(1, Number(item.quantity || 1)),
    selectedSize: String(item.selected_size || item.size || ""),
    selectedColor: String(item.selected_color || item.color || item.colour || ""),
    stock: Number(item.on_hand || 1),
    isCustom: Boolean(item.is_custom),
  };
};

export default function Cart() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const userId = Number(user?.id || 0);

  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadCart = async () => {
    if (!userId) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchCart(userId, 3);
      setCartItems(data.map(normalizeCartItem).filter((item) => item.id));
    } catch (err: any) {
      setCartItems([]);
      setError(err?.message || "Unable to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCart();

    const sync = () => {
      void loadCart();
    };

    window.addEventListener("cart-updated", sync);

    return () => {
      window.removeEventListener("cart-updated", sync);
    };
  }, [userId]);

  const getItemKey = (item: CartLine) => {
    return String(item.cartItemId || item.id);
  };

  const updateQuantity = async (item: CartLine, delta: number) => {
    if (!userId || updatingKey) return;

    const nextQuantity = Math.max(1, item.quantity + delta);
    if (nextQuantity === item.quantity) return;

    const key = getItemKey(item);
    setUpdatingKey(key);
    setError("");

    try {
      await updateCartQuantity({
        cart_item_id: item.cartItemId,
        user_id: userId,
        product_id: item.variantId || item.id,
        variant_id: item.variantId || item.id,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
        quantity: nextQuantity,
      });

      setCartItems((prev) =>
        prev.map((line) =>
          getItemKey(line) === key ? { ...line, quantity: nextQuantity } : line,
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Unable to update quantity");
    } finally {
      setUpdatingKey(null);
    }
  };

  const removeItem = async (item: CartLine) => {
    if (!userId || updatingKey) return;

    const key = getItemKey(item);
    setUpdatingKey(key);
    setError("");

    try {
      await removeFromCart({
        cart_item_id: item.cartItemId,
        user_id: userId,
        product_id: item.variantId || item.id,
        variant_id: item.variantId || item.id,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
      });

      setCartItems((prev) => prev.filter((line) => getItemKey(line) !== key));
    } catch (err: any) {
      setError(err?.message || "Unable to remove item");
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      navigate("/checkout");
    }
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const shipping = subtotal > 1000 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;

  const totalOriginalPrice = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
      0,
    );
  }, [cartItems]);

  const totalDiscount = Math.max(0, totalOriginalPrice - subtotal);

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 font-montserrat">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Please login to view your bag
            </h1>
            <p className="text-gray-500 mb-8">
              Login or create an account to add products to your bag.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-10 pb-20 font-montserrat flex items-center justify-center">
        <p className="text-gray-500 font-medium">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-4 md:pt-10 pb-40 md:pb-20 font-montserrat flex flex-col items-center">
      <div className="w-full md:px-4 max-w-[1440px]">
        <h1 className="hidden md:block text-xl font-medium text-gray-900 tracking-tight mb-4 px-4 md:px-8">
          My Bag{" "}
          <span className="text-black font-semibold">
            ({totalQuantity} Items)
          </span>
        </h1>

        <div className="md:hidden px-4 mb-4">
          <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">
            My Bag{" "}
            <span className="text-gray-500 font-normal">
              ({totalQuantity} item{totalQuantity !== 1 ? "s" : ""})
            </span>
          </h1>
        </div>

        {error ? (
          <div className="mx-4 md:mx-8 mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {cartItems.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-10 w-full px-0 md:px-8">
            <div className="flex-1 w-full">
              <div className="bg-white md:rounded-xl shadow-sm border-y md:border border-gray-100 overflow-hidden">
                <div className="flex flex-col divide-y divide-gray-100">
                  {cartItems.map((item) => {
                    const key = getItemKey(item);
                    const disabled = updatingKey === key;

                    return (
                      <div
                        key={key}
                        className="p-4 md:p-6 flex flex-row gap-4 md:gap-6 bg-white relative group"
                      >
                        <Link
                          to={`/product/${encodeURIComponent(String(item.variantId || item.id))}`}
                          className="w-[90px] h-[120px] md:w-32 md:h-40 shrink-0 bg-gray-50 rounded-[4px] md:rounded-lg overflow-hidden"
                        >
                          <img
                            src={item.images[0] || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover object-top"
                          />
                        </Link>

                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start pr-6 md:pr-0">
                            <div>
                              <p className="text-[13px] md:text-sm font-bold md:font-normal text-gray-900 md:text-gray-500 mb-0.5 md:mb-1">
                                {item.brand}
                              </p>
                              <Link
                                to={`/product/${encodeURIComponent(String(item.variantId || item.id))}`}
                                className="text-[12px] md:text-lg font-normal md:font-bold text-gray-500 md:text-gray-900 hover:text-primary transition-colors line-clamp-2 md:line-clamp-1 leading-snug"
                              >
                                {item.title}
                              </Link>

                              <p className="md:hidden text-[10.5px] text-[#ff8c4b] mt-1.5">
                                Hurry! Only {item.stock} Left
                              </p>
                              <p className="md:hidden text-[10.5px] text-gray-600 font-medium flex items-center gap-1 mt-1">
                                <FiTruck className="text-[#009b4d]" size={13} />{" "}
                                Ships in 1-2 days
                              </p>

                              <div className="hidden md:flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <p>
                                  Size:{" "}
                                  <span className="font-semibold text-gray-900">
                                    {item.selectedSize || "-"}
                                  </span>
                                </p>
                                <p>
                                  Color:{" "}
                                  <span className="font-semibold text-gray-900">
                                    {item.selectedColor || "-"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="hidden md:block text-right">
                              <p className="text-lg font-bold text-gray-900">
                                ₹{item.price}
                              </p>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <p className="text-sm text-gray-400 line-through">
                                  ₹{item.originalPrice}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => removeItem(item)}
                              disabled={disabled}
                              className="absolute top-4 right-4 md:hidden p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              <FiX size={18} />
                            </button>
                          </div>

                          <div className="flex items-end md:items-center justify-between mt-3 md:mt-6">
                            <div className="flex md:hidden items-center gap-2">
                              <button className="bg-white px-3 py-[5.5px] flex items-center gap-1 rounded-md text-xs font-medium text-black border border-gray-200">
                                Size : {item.selectedSize || "-"}
                              </button>
                              <div className="flex items-center border border-gray-200 rounded-md">
                                <button
                                  onClick={() => updateQuantity(item, -1)}
                                  disabled={disabled}
                                  className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50"
                                >
                                  <FiMinus size={14} />
                                </button>
                                <span className="w-8 text-xs text-center font-semibold text-gray-900">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item, 1)}
                                  disabled={disabled}
                                  className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50"
                                >
                                  <FiPlus size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="hidden md:flex items-center border border-gray-200 rounded-md">
                              <button
                                onClick={() => updateQuantity(item, -1)}
                                disabled={disabled}
                                className="px-3 py-2 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50"
                              >
                                <FiMinus size={16} />
                              </button>
                              <span className="w-10 text-center font-semibold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item, 1)}
                                disabled={disabled}
                                className="px-3 py-2 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50"
                              >
                                <FiPlus size={16} />
                              </button>
                            </div>

                            <div className="md:hidden text-right flex flex-col items-end">
                              <div className="flex items-end gap-1.5">
                                <span className="text-[14px] font-extrabold text-gray-900">
                                  ₹{item.price}
                                </span>
                                {item.originalPrice && item.originalPrice > item.price && (
                                  <span className="text-[11px] text-gray-400 line-through mb-[2px]">
                                    ₹{item.originalPrice}
                                  </span>
                                )}
                              </div>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-[10px] text-[#009b4d] font-semibold mt-1 tracking-wide">
                                  You saved ₹{item.originalPrice - item.price}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => removeItem(item)}
                              disabled={disabled}
                              className="hidden md:flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              <FiTrash2 size={16} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:hidden mt-4 bg-white border-y border-gray-100 flex flex-col">
                <details className="group overflow-hidden">
                  <summary className="flex justify-between items-center font-medium p-4 cursor-pointer outline-none marker:content-none [::-webkit-details-marker]:hidden">
                    <span className="text-[13px] text-gray-800">
                      Price Summary
                    </span>
                    <FiChevronDown
                      size={18}
                      className="text-gray-500 group-open:rotate-180 transition-transform"
                    />
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="flex flex-col gap-3 text-[13px] text-gray-600">
                      <div className="flex justify-between items-center">
                        <p>Total MRP (Incl. of taxes)</p>
                        <p className="font-medium text-gray-900">
                          ₹{subtotal + totalDiscount}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p>Discount on MRP</p>
                        <p className="font-medium text-[#009b4d]">
                          -₹{totalDiscount}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p>Shipping Charges</p>
                        <p className="font-medium text-gray-900">
                          {shipping === 0 ? (
                            <span className="text-[#009b4d]">FREE</span>
                          ) : (
                            `₹${shipping}`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
                <div className="flex justify-between items-center px-4 py-4 border-t border-gray-50 text-[13px]">
                  <span className="text-gray-800">Total</span>
                  <span className="font-extrabold text-[15px] text-gray-900">
                    ₹{total}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block w-full lg:w-[380px] shrink-0">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-28">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-6">
                  Order Summary
                </h2>

                <div className="flex flex-col gap-4 text-gray-600 mb-6 text-sm">
                  <div className="flex justify-between items-center">
                    <p>Total MRP (Incl. of taxes)</p>
                    <p className="font-medium text-gray-900">
                      ₹{subtotal + totalDiscount}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p>Discount on MRP</p>
                    <p className="font-medium text-green-600">
                      -₹{totalDiscount}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p>Estimated Shipping</p>
                    <p className="font-medium text-gray-900">
                      {shipping === 0 ? (
                        <span className="text-green-600 font-bold tracking-wide">
                          Free
                        </span>
                      ) : (
                        `₹${shipping}`
                      )}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900">Total</p>
                    <p className="text-2xl font-black text-gray-900">
                      ₹{total}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-4 bg-primary text-black font-bold tracking-widest text-[13px] uppercase rounded-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 mt-2"
                >
                  Proceed to Checkout <FiArrowRight size={18} />
                </button>

                <div className="mt-5 text-center">
                  <Link
                    to="/collections"
                    className="text-sm font-semibold text-gray-500 hover:text-black hover:underline"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 md:px-8 w-full mt-4">
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiTrash2 size={32} className="text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
                Your bag is empty
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Looks like you haven't added anything to your bag yet. Discover
                our latest collections and find something you love.
              </p>
              <Link
                to="/collections"
                className="inline-flex py-4 px-10 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-[1.02] transition-transform"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200/60 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
          {totalDiscount > 0 && (
            <div className="bg-[#00b259] text-white text-[11px] font-bold py-2 text-center flex items-center justify-center gap-1.5 tracking-wide">
              <LuBadgePercent size={14} />
              You are saving ₹{totalDiscount} on this order
            </div>
          )}
          <div className="px-4 py-3 flex justify-between items-center gap-4">
            <div className="flex flex-col flex-1 pl-1">
              <span className="font-extrabold text-[17px] text-gray-900 leading-tight">
                ₹{total}
              </span>
              <button
                onClick={() =>
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  })
                }
                className="text-[10px] font-bold tracking-wider text-[#4285f4] mt-0.5 text-left"
              >
                VIEW DETAILS
              </button>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="bg-[#fdd835] text-[#2c2c2c] min-w-[200px] font-extrabold px-6 py-3.5 rounded-[4px] text-[13px] tracking-wider uppercase flex items-center justify-center transition-opacity hover:opacity-90"
            >
              Proceed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}