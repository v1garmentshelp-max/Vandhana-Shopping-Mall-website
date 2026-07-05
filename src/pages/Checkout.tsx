import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  FiArrowLeft,
  FiCreditCard,
  FiMapPin,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import {
  clearCart,
  fetchCart,
  type CartApiItem,
} from "../services/cartApi";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type CheckoutItem = {
  cartItemId?: number;
  id: string | number;
  productId?: string | number | null;
  variantId?: string | number | null;
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  eanCode?: string | null;
  isCustom?: boolean;
};

type CheckoutForm = {
  fullName: string;
  mobile: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

type PaymentMethod = "COD" | "ONLINE";

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

const getNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

const normalizeCartItem = (item: CartApiItem): CheckoutItem => {
  const raw: any = item;
  const images = parseImages(raw.images);
  const fallbackImage =
    raw.front_image_url ||
    raw.image_url ||
    raw.main_image_url ||
    raw.back_image_url ||
    "/placeholder.svg";

  const price = getNumber(
    raw.final_price_b2c ||
      raw.sale_price ||
      raw.price ||
      raw.selling_price ||
      raw.discounted_price ||
      raw.mahaveer_price,
    0,
  );

  const originalPrice = getNumber(
    raw.original_price_b2c ||
      raw.mrp ||
      raw.originalPrice ||
      raw.original_price ||
      price,
    price,
  );

  return {
    cartItemId: raw.cart_item_id,
    id: raw.id || raw.variant_id || raw.product_id || raw.cart_item_id || "",
    productId: raw.product_id,
    variantId: raw.variant_id || raw.id,
    title: raw.product_name || raw.name || "Product",
    brand: raw.brand || raw.brand_name || "",
    price,
    originalPrice,
    image: images[0] || fallbackImage,
    quantity: Math.max(1, Number(raw.quantity || raw.qty || 1)),
    selectedSize: String(raw.selected_size || raw.size || ""),
    selectedColor: String(raw.selected_color || raw.color || raw.colour || ""),
    eanCode: raw.ean_code || raw.barcode || null,
    isCustom: Boolean(raw.is_custom),
  };
};

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const userId = Number(user?.id || 0);

  const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [error, setError] = useState("");

  const [form, setForm] = useState<CheckoutForm>({
    fullName: user?.name || "",
    mobile: user?.mobile || "",
    email: user?.email || "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let alive = true;

    const loadCart = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchCart(userId, 3);
        if (alive) setCartItems(data.map(normalizeCartItem));
      } catch (err: any) {
        if (alive) {
          setError(err?.message || "Unable to load cart");
          setCartItems([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadCart();

    return () => {
      alive = false;
    };
  }, [userId]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalOriginalPrice = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
      0,
    );
  }, [cartItems]);

  const shipping = subtotal > 1000 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;
  const totalDiscount = Math.max(0, totalOriginalPrice - subtotal);

  const handleChange = (field: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return "Please enter full name";
    if (!form.mobile.trim()) return "Please enter mobile number";
    if (form.mobile.replace(/\D/g, "").length < 10) return "Please enter valid mobile number";
    if (!form.addressLine1.trim()) return "Please enter address";
    if (!form.city.trim()) return "Please enter city";
    if (!form.state.trim()) return "Please enter state";
    if (!form.pincode.trim()) return "Please enter pincode";
    if (form.pincode.replace(/\D/g, "").length < 6) return "Please enter valid pincode";
    if (cartItems.length === 0) return "Your cart is empty";
    return "";
  };

  const buildOrderPayload = () => {
    return {
      customer_name: form.fullName.trim(),
      customer_email: form.email.trim(),
      customer_mobile: form.mobile.trim(),
      login_email: form.email.trim(),
      branch_id: 3,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "COD" ? "COD" : "PENDING",
      shipping_address: {
        line1: form.addressLine1.trim(),
        line2: form.addressLine2.trim(),
        address_line1: form.addressLine1.trim(),
        address_line2: form.addressLine2.trim(),
        landmark: form.landmark.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      },
      totals: {
        bagTotal: subtotal + totalDiscount,
        discountTotal: totalDiscount,
        couponPct: 0,
        couponDiscount: 0,
        convenience: shipping,
        giftWrap: 0,
        shipping,
        subtotal,
        total,
        payable: total,
      },
      items: cartItems.map((item) => ({
        cart_item_id: item.cartItemId,
        product_id: item.productId,
        variant_id: item.variantId || item.id,
        name: item.title,
        product_name: item.title,
        brand: item.brand,
        price: item.price,
        mrp: item.originalPrice || item.price,
        qty: item.quantity,
        quantity: item.quantity,
        size: item.selectedSize,
        colour: item.selectedColor,
        color: item.selectedColor,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
        image_url: item.image,
        ean_code: item.eanCode,
        is_custom: item.isCustom,
      })),
    };
  };

  const createCodOrder = async () => {
    const payload = buildOrderPayload();

    const res = await fetch(`${API_BASE}/api/orders/web/place`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Unable to place order");
    }

    await clearCart(userId).catch(() => null);

    const orderId = data?.id || data?.order_id || data?.order?.id || "success";
    navigate(`/order-success/${orderId}`);
  };

  const createOnlinePaymentOrder = async () => {
    const payload = buildOrderPayload();

    const res = await fetch(`${API_BASE}/api/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Unable to start online payment");
    }

    if (data?.payment_url) {
      window.location.href = data.payment_url;
      return;
    }

    const loaded = await loadRazorpayScript();

    if (!loaded || !(window as any).Razorpay) {
      throw new Error("Unable to load payment gateway");
    }

    const razorpayOrderId =
      data?.razorpay_order_id || data?.order_id || data?.order?.id;

    if (!razorpayOrderId) {
      throw new Error("Payment order id not found");
    }

    const options = {
      key: data?.key_id || data?.key,
      amount: data?.amount || total * 100,
      currency: data?.currency || "INR",
      name: "V1Garments",
      description: "Order Payment",
      order_id: razorpayOrderId,
      prefill: {
        name: form.fullName,
        email: form.email,
        contact: form.mobile,
      },
      handler: async (response: any) => {
        const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...response,
            user_id: userId,
            checkout_payload: payload,
          }),
        });

        const verifyData = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok) {
          throw new Error(verifyData?.message || "Payment verification failed");
        }

        await clearCart(userId).catch(() => null);

        const orderId =
          verifyData?.order_id ||
          verifyData?.id ||
          verifyData?.order?.id ||
          "success";

        navigate(`/order-success/${orderId}`);
      },
      modal: {
        ondismiss: () => {
          setPlacingOrder(false);
        },
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  const handlePlaceOrder = async () => {
    if (placingOrder) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setPlacingOrder(true);
    setError("");

    try {
      if (paymentMethod === "COD") {
        await createCodOrder();
      } else {
        await createOnlinePaymentOrder();
      }
    } catch (err: any) {
      setError(err?.message || "Unable to place order");
      setPlacingOrder(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 font-montserrat">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Please login to checkout
            </h1>
            <p className="text-gray-500 mb-8">
              Login or create an account to place your order.
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
        <p className="text-gray-500 font-medium">Loading checkout...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 font-montserrat">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Your cart is empty
            </h1>
            <p className="text-gray-500 mb-8">
              Add products to your cart before checkout.
            </p>
            <Link
              to="/collections"
              className="inline-flex py-4 px-10 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-[1.02] transition-transform"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-10 pb-32 font-montserrat">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black mb-3"
            >
              <FiArrowLeft size={16} />
              Back to Cart
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Checkout
            </h1>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-10">
          <div className="space-y-6">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center text-black">
                  <FiUser size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Contact Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    We will use these details for delivery updates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
                <input
                  value={form.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  placeholder="Mobile number"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
                <input
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black md:col-span-2"
                />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center text-black">
                  <FiMapPin size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Delivery Address
                  </h2>
                  <p className="text-sm text-gray-500">
                    Enter complete address for accurate delivery.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.addressLine1}
                  onChange={(e) => handleChange("addressLine1", e.target.value)}
                  placeholder="House no, building, street"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black md:col-span-2"
                />
                <input
                  value={form.addressLine2}
                  onChange={(e) => handleChange("addressLine2", e.target.value)}
                  placeholder="Area, colony, road"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black md:col-span-2"
                />
                <input
                  value={form.landmark}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  placeholder="Landmark"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black md:col-span-2"
                />
                <input
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="City"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
                <input
                  value={form.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="State"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
                <input
                  value={form.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value)}
                  placeholder="Pincode"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center text-black">
                  <FiCreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Payment Method
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose how you want to pay.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("COD")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    paymentMethod === "COD"
                      ? "border-black bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">
                    Cash on Delivery
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pay when your order arrives.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("ONLINE")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    paymentMethod === "ONLINE"
                      ? "border-black bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">
                    Online Payment
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pay securely using UPI, cards, or net banking.
                  </p>
                </button>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 h-fit bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              Order Summary
            </h2>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={`${item.cartItemId || item.id}-${item.variantId}-${item.selectedSize}-${item.selectedColor}`}
                  className="flex gap-3"
                >
                  <div className="w-16 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase line-clamp-1">
                      {item.brand}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Size: {item.selectedSize} | Color: {item.selectedColor}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-6 pt-5 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total MRP</span>
                <span className="font-medium text-gray-900">
                  ₹{subtotal + totalDiscount}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="font-medium text-green-600">
                  -₹{totalDiscount}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-medium text-gray-900">
                  {shipping === 0 ? "FREE" : `₹${shipping}`}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-black text-gray-900">
                  ₹{total}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-gray-500">
              <FiTruck size={16} />
              <span>Estimated delivery in 4 to 6 days</span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder}
              className="mt-6 w-full py-4 bg-primary text-black font-bold tracking-widest text-[13px] uppercase rounded-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
            >
              {placingOrder
                ? paymentMethod === "COD"
                  ? "Placing Order..."
                  : "Starting Payment..."
                : paymentMethod === "COD"
                  ? "Place COD Order"
                  : "Pay Online"}{" "}
              <FiArrowLeft size={18} className="rotate-180" />
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}