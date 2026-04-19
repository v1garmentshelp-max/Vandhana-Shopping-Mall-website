import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { BiGridAlt } from "react-icons/bi";
import {
  FiBox,
  FiMapPin,
  FiUser,
  FiLogOut,
  FiInfo,
  FiChevronRight,
} from "react-icons/fi";
import productData from "../Data/Products.json";
import type { Product } from "../Models/Product";

const PRODUCTS = productData as unknown as Product[];
const DUMMY_ORDERS = PRODUCTS.slice(0, 2);

export default function Profile() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const sidebarLinks = [
    { id: "overview", icon: <BiGridAlt size={22} />, title: "Overview" },
    { id: "orders", icon: <FiBox size={22} />, title: "My Orders" },
    { id: "addresses", icon: <FiMapPin size={22} />, title: "My Addresses" },
    { id: "profile", icon: <FiUser size={22} />, title: "My Profile" },
  ];

  const statCards = [
    {
      id: "orders",
      icon: <FiBox size={24} className="text-gray-700" />,
      title: "My Orders",
      desc: "View, Modify And Track Orders",
    },
    {
      id: "addresses",
      icon: <FiMapPin size={24} className="text-gray-700" />,
      title: "My Addresses",
      desc: "Edit, Add Or Remove Addresses",
    },
    {
      id: "profile",
      icon: <FiUser size={24} className="text-gray-700" />,
      title: "My Profile",
      desc: "Edit Personal Info And Change Password",
    },
    {
      id: "support",
      icon: <FiInfo size={24} className="text-gray-700" />,
      title: "Help & Support",
      desc: "Reach Out To Us",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "orders":
        return <OrdersTab />;
      case "addresses":
        return <AddressesTab />;
      case "profile":
        return <ProfileTab />;
      case "overview":
      default:
        return (
          <>
            {/* Pastel Yellow Banner */}
            <div className="bg-[#fff9ea] rounded-xl p-8 border border-[#feedc5] shadow-sm relative overflow-hidden mb-6 pt-10 pb-8">
              <div className="flex items-start md:items-center gap-6 flex-col md:flex-row mb-8">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#fdd835] text-black font-bold text-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(253,216,53,0.3)]">
                  U
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    User Name
                  </h2>
                  <p className="text-[13px] text-gray-600 font-medium">
                    User@gmail.com
                  </p>
                  <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                    9999999999
                  </p>
                </div>
              </div>
              {/* Edit Profile Button */}
              <button
                onClick={() => setActiveTab("profile")}
                className="w-full py-4 px-6 bg-[#fdd835] text-[#2c2c2c] font-extrabold text-[13px] tracking-wider uppercase rounded-[4px] hover:bg-[#f2c713] transition-colors"
              >
                Edit Profile
              </button>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => card.id !== "support" && setActiveTab(card.id)}
                  className={`bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all group ${
                    card.id !== "support"
                      ? "cursor-pointer hover:shadow-md hover:border-gray-300"
                      : ""
                  }`}
                >
                  <div className="w-12 h-12 mb-3 bg-gray-50/80 rounded-full flex items-center justify-center group-hover:bg-[#fdd835]/10 group-hover:text-primary transition-colors">
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-[15px] mb-1.5 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-gray-500 font-medium leading-relaxed px-2">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTab("profile")}
              className="w-full md:hidden flex items-center justify-center gap-2 mt-3 py-4 px-6 bg-red-500/20 text-red-500 font-extrabold text-[13px] tracking-wider uppercase rounded-[4px] hover:bg-red-500/30 transition-colors"
            >
              <FiLogOut size={22} />
              <span className="text-[15px] font-bold">Logout</span>
            </button>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-20 font-montserrat flex justify-center">
      <div className="w-full max-w-[1440px] px-4 md:px-8 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left Sidebar */}
        <div className="w-full md:w-72 shrink-0 hidden md:block">
          <div className="md:sticky md:top-28 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
            {sidebarLinks.map((link, i) => (
              <div
                key={i}
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-4 px-6 py-5 cursor-pointer transition-all border-b border-gray-100 last:border-b-0 ${
                  activeTab === link.id
                    ? "text-[#4285f4] border-l-4 border-l-[#4285f4] bg-[#f8fbff]"
                    : "hover:bg-gray-50 text-gray-600 border-l-4 border-l-transparent"
                }`}
              >
                {link.icon}
                <span
                  className={`text-[15px] font-medium ${
                    activeTab === link.id ? "font-bold" : ""
                  }`}
                >
                  {link.title}
                </span>
              </div>
            ))}
            {/* Logout button */}
            <div className="flex items-center gap-4 px-6 py-5 cursor-pointer border-t border-gray-100 text-red-500 hover:bg-red-50 transition-colors border-l-4 border-l-transparent">
              <FiLogOut size={22} />
              <span className="text-[15px] font-bold">Logout</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full">{renderContent()}</div>
      </div>
    </div>
  );
}

const OrdersTab = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
    <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight">
      My Orders
    </h2>
    <div className="flex flex-col gap-6">
      {DUMMY_ORDERS.map((order) => (
        <div
          key={order.id}
          className="flex gap-6 p-4 border border-gray-100 rounded-lg hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow bg-white"
        >
          <div className="shrink max-w-[30%] aspect-3/4 bg-gray-50 rounded-md overflow-hidden">
            <img
              src={order.images[0]}
              alt={order.title}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="flex-1 flex justify-between flex-col">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">
                {order.brand}
              </p>
              <p className="font-bold text-[15px] text-gray-900 line-clamp-2 md:line-clamp-1 leading-snug">
                {order.title}
              </p>
              <p className="text-[13px] text-gray-500 mt-2 font-medium">
                Size: M | Qty: 1
              </p>
              <p className="text-[15px] font-extrabold text-gray-900 mt-2">
                ₹{order.price}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center justify-between pt-4 md:pt-0 border-t border-gray-100 md:border-none">
              <span className="px-3.5 py-1.5 bg-[#f0fbf4] text-[#009b4d] text-[11px] font-extrabold tracking-widest uppercase rounded-full">
                Delivered
              </span>
              <button className="text-[13px] font-bold text-[#4285f4] hover:underline flex items-center gap-0.5">
                Track <FiChevronRight size={16} />次{" "}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AddressesTab = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 tracking-tight">
        My Addresses
      </h2>
      <button className="px-5 py-2.5 bg-[#fdd835] text-[#2c2c2c] text-[11px] font-extrabold tracking-widest uppercase rounded hover:bg-[#f2c713] transition-colors shadow-sm">
        Add New
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-6 border border-gray-200 rounded-lg relative hover:border-[rgba(253,216,53,0.5)] hover:bg-[#fffdf6] transition-colors group">
        <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-sm inline-block mb-4">
          Home
        </span>
        <h3 className="font-bold text-[15px] text-gray-900 mb-2">User Name</h3>
        <p className="text-[13px] text-gray-600 leading-relaxed mb-5 font-medium">
          Flat 402, Block A, Sunshine Apartments
          <br />
          Madhapur, Hyderabad
          <br />
          Telangana 500081
        </p>
        <p className="text-[13px] text-gray-600 font-bold mb-5 pb-5 border-b border-gray-100">
          Mobile: <span className="font-medium">9999999999</span>
        </p>
        <div className="flex gap-4">
          <button className="text-[13px] font-bold text-[#4285f4] hover:underline">
            Edit
          </button>
          <button className="text-[13px] font-bold text-red-500 hover:text-red-700">
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ProfileTab = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
    <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight pb-6 border-b border-gray-100">
      Edit Profile
    </h2>
    <form
      className="max-w-xl flex flex-col gap-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
            First Name
          </label>
          <input
            type="text"
            defaultValue="User"
            className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
            Last Name
          </label>
          <input
            type="text"
            defaultValue="Name"
            className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
          Email Address
        </label>
        <input
          type="email"
          defaultValue="User@gmail.com"
          disabled
          className="w-full px-4 py-3.5 bg-gray-50 text-gray-500 text-[14px] font-medium rounded-md border border-gray-200"
        />
        <p className="text-[11px] text-gray-400 font-medium mt-2">
          Email address cannot be changed.
        </p>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
          Mobile Number
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm font-bold">
            +91
          </span>
          <input
            type="tel"
            defaultValue="9999999999"
            className="w-full px-4 py-3.5 rounded-r-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>
      <div className="pt-6 border-t border-gray-100 mt-2">
        <h3 className="font-bold text-[15px] text-gray-900 mb-5">
          Change Password
        </h3>
        <div className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Current Password"
            className="w-full px-4 py-3 placeholder:text-gray-400 rounded-md border border-gray-200 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
          />
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-4 py-3 placeholder:text-gray-400 rounded-md border border-gray-200 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          type="submit"
          className="px-10 py-3.5 bg-[#fdd835] text-[#2c2c2c] font-extrabold text-[12px] tracking-widest uppercase rounded hover:bg-[#f2c713] transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>
    </form>
  </div>
);
