import { useState } from "react";
import { Link } from "react-router";
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
import productData from "../Data/Products.json";
import type { Product } from "../Models/Product";

const PRODUCTS = productData as unknown as Product[];

// Dummy initial cart data
const initialCartItems = PRODUCTS.slice(0, 3).map((p) => ({
  ...p,
  quantity: 1,
  selectedSize: p.sizes?.[0] || "M",
  selectedColor: p.colors?.[0] || "Black",
  stock: Object.values(p.stockBySize || {}).reduce((a, b) => a + b, 0) || 15,
}));

export default function Cart() {
  const [cartItems, setCartItems] = useState(initialCartItems);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = subtotal > 1000 ? 0 : 99;
  const total = subtotal + shipping;

  const totalOriginalPrice = cartItems.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0,
  );
  const totalDiscount = totalOriginalPrice - subtotal;

  return (
    <div className="min-h-screen bg-gray-50 pt-4 md:pt-10 pb-40 md:pb-20 font-montserrat flex flex-col items-center">
      <div className="w-full md:px-4 max-w-[1440px]">
        {/* Desktop Header */}
        <h1 className="hidden md:block text-xl font-medium text-gray-900 tracking-tight mb-4 px-4 md:px-8">
          My Bag{" "}
          <span className="text-black font-semibold">
            ({cartItems.length} Items)
          </span>
        </h1>

        {/* Mobile Header */}
        <div className="md:hidden px-4 mb-4">
          <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">
            My Bag{" "}
            <span className="text-gray-500 font-normal">
              ({cartItems.length} item{cartItems.length !== 1 ? "s" : ""})
            </span>
          </h1>
        </div>

        {cartItems.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-10 w-full px-0 md:px-8">
            {/* Cart Items List */}
            <div className="flex-1 w-full">
              <div className="bg-white md:rounded-xl shadow-sm border-y md:border border-gray-100 overflow-hidden">
                <div className="flex flex-col divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 md:p-6 flex flex-row gap-4 md:gap-6 bg-white relative group"
                    >
                      <Link
                        to={`/product/${item.id}`}
                        className="w-[90px] h-[120px] md:w-32 md:h-40 shrink-0 bg-gray-50 rounded-[4px] md:rounded-lg overflow-hidden"
                      >
                        <img
                          src={item.images[0]}
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
                              to={`/product/${item.id}`}
                              className="text-[12px] md:text-lg font-normal md:font-bold text-gray-500 md:text-gray-900 hover:text-primary transition-colors line-clamp-2 md:line-clamp-1 leading-snug"
                            >
                              {item.title}
                            </Link>

                            {/* Mobile exclusive labels */}
                            <p className="md:hidden text-[10.5px] text-[#ff8c4b] mt-1.5">
                              Hurry! Only {item.stock} Left
                            </p>
                            <p className="md:hidden text-[10.5px] text-gray-600 font-medium flex items-center gap-1 mt-1">
                              <FiTruck className="text-[#009b4d]" size={13} />{" "}
                              Ships in 1-2 days
                            </p>

                            {/* Desktop Attributes */}
                            <div className="hidden md:flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <p>
                                Size:{" "}
                                <span className="font-semibold text-gray-900">
                                  {item.selectedSize}
                                </span>
                              </p>
                              <p>
                                Color:{" "}
                                <span className="font-semibold text-gray-900">
                                  {item.selectedColor}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Desktop Pricing */}
                          <div className="hidden md:block text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ₹{item.price}
                            </p>
                            {item.originalPrice && (
                              <p className="text-sm text-gray-400 line-through">
                                ₹{item.originalPrice}
                              </p>
                            )}
                          </div>

                          {/* Mobile Remove Icon */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-4 right-4 md:hidden p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <FiX size={18} />
                          </button>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-end md:items-center justify-between mt-3 md:mt-6">
                          {/* Mobile Selectors */}
                          <div className="flex md:hidden items-center gap-2">
                            <button className="bg-white px-3 py-[5.5px] flex items-center gap-1 rounded-md text-xs font-medium text-black border border-gray-200">
                              Size : {item.selectedSize}{" "}
                            </button>
                            <div className="flex items-center border border-gray-200 rounded-md">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
                              >
                                <FiMinus size={14} />
                              </button>
                              <span className="w-8 text-xs text-center font-semibold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
                              >
                                <FiPlus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Desktop Quantity Tools */}
                          <div className="hidden md:flex items-center border border-gray-200 rounded-md">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-3 py-2 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
                            >
                              <FiMinus size={16} />
                            </button>
                            <span className="w-10 text-center font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-3 py-2 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
                            >
                              <FiPlus size={16} />
                            </button>
                          </div>

                          {/* Mobile Pricing aligned right */}
                          <div className="md:hidden text-right flex flex-col items-end">
                            <div className="flex items-end gap-1.5">
                              <span className="text-[14px] font-extrabold text-gray-900">
                                ₹{item.price}
                              </span>
                              {item.originalPrice && (
                                <span className="text-[11px] text-gray-400 line-through mb-[2px]">
                                  ₹{item.originalPrice}
                                </span>
                              )}
                            </div>
                            {item.originalPrice && (
                              <span className="text-[10px] text-[#009b4d] font-semibold mt-1 tracking-wide">
                                You saved ₹{item.originalPrice - item.price}
                              </span>
                            )}
                          </div>

                          {/* Desktop Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="hidden md:flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
                          >
                            <FiTrash2 size={16} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Price Summary Section (Accordion) */}
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

                {/* Free Delivery Banner inside flow */}
                {/* <div className="bg-[#f0fbf4] w-full py-2.5 px-4 text-center text-xs text-gray-700 tracking-wide mt-2 border-b-2 border-white">
                  Yayy! You get{" "}
                  <span className="text-[#009b4d] font-extrabold">
                    FREE delivery
                  </span>{" "}
                  on this order
                </div> */}
              </div>
            </div>

            {/* Desktop Order Summary Sidebar */}
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

                <button className="w-full py-4 bg-primary text-black font-bold tracking-widest text-[13px] uppercase rounded-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 mt-2">
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

      {/* Mobile Sticky Bottom Action Bar */}
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
            <button className="bg-[#fdd835] text-[#2c2c2c] min-w-[200px] font-extrabold px-6 py-3.5 rounded-[4px] text-[13px] tracking-wider uppercase flex items-center justify-center transition-opacity hover:opacity-90">
              Proceed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
