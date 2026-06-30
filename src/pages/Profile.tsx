import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BiGridAlt } from "react-icons/bi";
import {
  FiBox,
  FiMapPin,
  FiUser,
  FiLogOut,
  FiInfo,
  FiChevronRight,
} from "react-icons/fi";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type CustomerProfile = {
  id?: number;
  name: string;
  email: string;
  mobile: string;
  type?: string;
};

type OrderItem = {
  variant_id?: number;
  qty: number;
  price: number;
  mrp?: number | null;
  size?: string | null;
  colour?: string | null;
  ean_code?: string | null;
  image_url?: string | null;
  product_name?: string | null;
  brand_name?: string | null;
};

type OrderRecord = {
  id: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
  totals?: {
    payable?: number;
    bagTotal?: number;
    discountTotal?: number;
  } | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_mobile?: string | null;
  shipping_address?: Record<string, any> | null;
  items: OrderItem[];
};

type AddressRecord = {
  key: string;
  label: string;
  name: string;
  mobile: string;
  address: Record<string, any>;
};

const getStoredToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

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

const getInitialEmail = () => {
  const user = getStoredUser();
  return user?.email || "";
};

const getInitialName = () => {
  const user = getStoredUser();
  return user?.name || "";
};

const getInitialMobile = () => {
  const user = getStoredUser();
  return user?.mobile || "";
};

const formatCurrency = (value?: number | null) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitial = (name: string, email: string) => {
  const source = (name || email || "U").trim();
  return source.charAt(0).toUpperCase();
};

const statusBadgeClasses = (status: string) => {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "bg-[#f0fbf4] text-[#009b4d]";
  if (s === "CANCELLED") return "bg-red-50 text-red-600";
  if (s === "PLACED" || s === "PENDING" || s === "PROCESSING")
    return "bg-[#fff9ea] text-[#9b7a00]";
  return "bg-gray-100 text-gray-600";
};

const normalizeOrders = (data: any): OrderRecord[] => {
  if (!Array.isArray(data)) return [];
  return data.map((order: any) => ({
    id: String(order.id || ""),
    status: String(order.status || "PLACED"),
    payment_status: order.payment_status || "",
    payment_method: order.payment_method || "",
    created_at: order.created_at || "",
    totals: order.totals || null,
    customer_name: order.customer_name || "",
    customer_email: order.customer_email || "",
    customer_mobile: order.customer_mobile || "",
    shipping_address:
      order.shipping_address && typeof order.shipping_address === "object"
        ? order.shipping_address
        : null,
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          variant_id: item.variant_id,
          qty: Number(item.qty || 1),
          price: Number(item.price || 0),
          mrp: item.mrp != null ? Number(item.mrp) : null,
          size: item.size || "",
          colour: item.colour || "",
          ean_code: item.ean_code || "",
          image_url: item.image_url || "",
          product_name: item.product_name || "",
          brand_name: item.brand_name || "",
        }))
      : [],
  }));
};

const buildAddressLabel = (address: Record<string, any>, index: number) => {
  if (address?.label) return String(address.label);
  if (index === 0) return "Home";
  return `Address ${index + 1}`;
};

const buildAddressKey = (address: Record<string, any>) =>
  JSON.stringify({
    line1: address?.line1 || "",
    line2: address?.line2 || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
  });

const formatAddressText = (address: Record<string, any>) => {
  const lines = [
    address?.line1,
    address?.line2,
    [address?.city, address?.state].filter(Boolean).join(", "),
    address?.pincode,
  ].filter(Boolean);
  return lines.join("\n");
};

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({
    name: getInitialName(),
    email: getInitialEmail(),
    mobile: getInitialMobile(),
    type: "",
  });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    currentPassword: "",
    newPassword: "",
  });
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser?.email) {
      navigate("/auth");
      return;
    }
    void loadProfileAndOrders(storedUser.email);
  }, [navigate]);

  const loadProfileAndOrders = async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/user/by-email/${encodeURIComponent(email)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE}/api/sales/web/by-user?email=${encodeURIComponent(email)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      let nextProfile: CustomerProfile = {
        name: getInitialName(),
        email,
        mobile: getInitialMobile(),
        type: "",
      };

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        nextProfile = {
          id: profileData.id,
          name: profileData.name || storedUserNameFromEmail(email),
          email: profileData.email || email,
          mobile: profileData.mobile || "",
          type: profileData.type || "",
        };
      } else {
        const fallbackUser = getStoredUser();
        nextProfile = {
          id: fallbackUser?.id,
          name: fallbackUser?.name || storedUserNameFromEmail(email),
          email: fallbackUser?.email || email,
          mobile: fallbackUser?.mobile || "",
          type: fallbackUser?.type || "",
        };
      }

      setProfile(nextProfile);
      setForm({
        firstName:
          nextProfile.name?.split(" ").slice(0, -1).join(" ") ||
          nextProfile.name ||
          "",
        lastName:
          nextProfile.name?.split(" ").slice(-1).join(" ") === nextProfile.name
            ? ""
            : nextProfile.name?.split(" ").slice(-1).join(" "),
        mobile: nextProfile.mobile || "",
        currentPassword: "",
        newPassword: "",
      });

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(normalizeOrders(ordersData));
      } else {
        setOrders([]);
      }

      syncStoredUser(nextProfile);
    } catch {
      setError("Unable to load your profile right now.");
    } finally {
      setLoading(false);
    }
  };

  const storedUserNameFromEmail = (email: string) => {
    const prefix = String(email || "").split("@")[0] || "User";
    return prefix
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const syncStoredUser = (nextProfile: CustomerProfile) => {
    const current = getStoredUser() || {};
    const merged = {
      ...current,
      id: nextProfile.id ?? current.id,
      name: nextProfile.name ?? current.name,
      email: nextProfile.email ?? current.email,
      mobile: nextProfile.mobile ?? current.mobile,
      type: nextProfile.type ?? current.type,
    };
    localStorage.setItem("user", JSON.stringify(merged));
    sessionStorage.setItem("user", JSON.stringify(merged));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/auth");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setMessage("");

    try {
      const fullName =
        `${form.firstName} ${form.lastName}`.trim() || profile.name;
      let updatedMobile = profile.mobile;

      if ((form.mobile || "").trim() !== (profile.mobile || "").trim()) {
        const res = await fetch(`${API_BASE}/api/user/update-mobile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: profile.email,
            mobile: form.mobile.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Unable to update mobile number");
        }

        updatedMobile = data.mobile || form.mobile.trim();
      }

      if (form.currentPassword.trim() || form.newPassword.trim()) {
        const passwordRes = await fetch(`${API_BASE}/api/auth/change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getStoredToken()}`,
          },
          body: JSON.stringify({
            old_password: form.currentPassword.trim(),
            new_password: form.newPassword.trim(),
          }),
        });

        const passwordData = await passwordRes.json().catch(() => ({}));

        if (!passwordRes.ok) {
          throw new Error(passwordData.message || "Unable to update password");
        }
      }

      const updatedProfile = {
        ...profile,
        name: fullName,
        mobile: updatedMobile,
      };

      setProfile(updatedProfile);
      syncStoredUser(updatedProfile);
      setForm((prev) => ({
        ...prev,
        mobile: updatedMobile,
        currentPassword: "",
        newPassword: "",
      }));
      setMessage("Profile updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  };

  const addresses = useMemo<AddressRecord[]>(() => {
    const seen = new Set<string>();
    const out: AddressRecord[] = [];

    orders.forEach((order, index) => {
      const address =
        order.shipping_address && typeof order.shipping_address === "object"
          ? order.shipping_address
          : null;
      if (!address) return;
      const key = buildAddressKey(address);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        key,
        label: buildAddressLabel(address, index),
        name: order.customer_name || profile.name || "User",
        mobile: order.customer_mobile || profile.mobile || "",
        address,
      });
    });

    return out;
  }, [orders, profile.name, profile.mobile]);

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
      desc: "View, modify and track orders",
    },
    {
      id: "addresses",
      icon: <FiMapPin size={24} className="text-gray-700" />,
      title: "My Addresses",
      desc: "View your saved addresses",
    },
    {
      id: "profile",
      icon: <FiUser size={24} className="text-gray-700" />,
      title: "My Profile",
      desc: "Edit personal info and password",
    },
    {
      id: "support",
      icon: <FiInfo size={24} className="text-gray-700" />,
      title: "Help & Support",
      desc: "Reach out to us",
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex items-center justify-center">
          <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "orders":
        return <OrdersTab orders={orders} />;
      case "addresses":
        return <AddressesTab addresses={addresses} />;
      case "profile":
        return (
          <ProfileTab
            profile={profile}
            form={form}
            setForm={setForm}
            onSubmit={handleSaveProfile}
            saving={savingProfile}
            message={message}
            error={error}
          />
        );
      case "overview":
      default:
        return (
          <>
            <div className="bg-[#fff9ea] rounded-xl p-8 border border-[#feedc5] shadow-sm relative overflow-hidden mb-6 pt-10 pb-8">
              <div className="flex items-start md:items-center gap-6 flex-col md:flex-row mb-8">
                <div className="w-16 h-16 rounded-full bg-[#fdd835] text-black font-bold text-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(253,216,53,0.3)]">
                  {getInitial(profile.name, profile.email)}
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {profile.name || "User"}
                  </h2>
                  <p className="text-[13px] text-gray-600 font-medium">
                    {profile.email || "-"}
                  </p>
                  <p className="text-[13px] text-gray-600 font-medium tracking-wide">
                    {profile.mobile || "-"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("profile")}
                className="w-full py-4 px-6 bg-[#fdd835] text-[#2c2c2c] font-extrabold text-[13px] tracking-wider uppercase rounded-[4px] hover:bg-[#f2c713] transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (card.id === "support") {
                      window.location.href =
                        "mailto:support@vandhanashoppingmall.com";
                      return;
                    }
                    setActiveTab(card.id);
                  }}
                  className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all group cursor-pointer hover:shadow-md hover:border-gray-300"
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
              onClick={handleLogout}
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
            <div
              onClick={handleLogout}
              className="flex items-center gap-4 px-6 py-5 cursor-pointer border-t border-gray-100 text-red-500 hover:bg-red-50 transition-colors border-l-4 border-l-transparent"
            >
              <FiLogOut size={22} />
              <span className="text-[15px] font-bold">Logout</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full">{renderContent()}</div>
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: OrderRecord[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight">
        My Orders
      </h2>

      {!orders.length ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-500 font-medium">No orders found yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order) =>
            (order.items.length
              ? order.items
              : [{ qty: 1, price: Number(order.totals?.payable || 0) }]).map(
              (item, index) => (
                <div
                  key={`${order.id}-${item.variant_id || index}`}
                  className="flex gap-6 p-4 border border-gray-100 rounded-lg hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow bg-white"
                >
                  <div className="shrink max-w-[30%] aspect-[3/4] bg-gray-50 rounded-md overflow-hidden">
                    <img
                      src={
                        item.image_url ||
                        "https://via.placeholder.com/300x400?text=Product"
                      }
                      alt={item.product_name || "Product"}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  <div className="flex-1 flex justify-between flex-col">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">
                        {item.brand_name || "Brand"}
                      </p>
                      <p className="font-bold text-[15px] text-gray-900 line-clamp-2 md:line-clamp-1 leading-snug">
                        {item.product_name || "Order Item"}
                      </p>
                      <p className="text-[13px] text-gray-500 mt-2 font-medium">
                        Size: {item.size || "-"} | Qty: {item.qty || 1}
                      </p>
                      <p className="text-[13px] text-gray-500 mt-1 font-medium">
                        Ordered on {formatDate(order.created_at) || "-"}
                      </p>
                      <p className="text-[15px] font-extrabold text-gray-900 mt-2">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center justify-between pt-4 md:pt-0 border-t border-gray-100 md:border-none">
                      <span
                        className={`px-3.5 py-1.5 text-[11px] font-extrabold tracking-widest uppercase rounded-full ${statusBadgeClasses(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                      <button className="text-[13px] font-bold text-[#4285f4] hover:underline flex items-center gap-0.5">
                        Order ID: {order.id.slice(0, 8)}
                        <FiChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ),
            ),
          )}
        </div>
      )}
    </div>
  );
}

function AddressesTab({ addresses }: { addresses: AddressRecord[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          My Addresses
        </h2>
      </div>

      {!addresses.length ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-500 font-medium">No addresses found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((item) => (
            <div
              key={item.key}
              className="p-6 border border-gray-200 rounded-lg relative hover:border-[rgba(253,216,53,0.5)] hover:bg-[#fffdf6] transition-colors group"
            >
              <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-sm inline-block mb-4">
                {item.label}
              </span>
              <h3 className="font-bold text-[15px] text-gray-900 mb-2">
                {item.name || "User"}
              </h3>
              <p className="text-[13px] text-gray-600 leading-relaxed mb-5 font-medium whitespace-pre-line">
                {formatAddressText(item.address)}
              </p>
              <p className="text-[13px] text-gray-600 font-bold mb-5 pb-5 border-b border-gray-100">
                Mobile: <span className="font-medium">{item.mobile || "-"}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({
  profile,
  form,
  setForm,
  onSubmit,
  saving,
  message,
  error,
}: {
  profile: CustomerProfile;
  form: {
    firstName: string;
    lastName: string;
    mobile: string;
    currentPassword: string;
    newPassword: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      firstName: string;
      lastName: string;
      mobile: string;
      currentPassword: string;
      newPassword: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  saving: boolean;
  message: string;
  error: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight pb-6 border-b border-gray-100">
        Edit Profile
      </h2>

      {message ? (
        <div className="mb-5 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form className="max-w-xl flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
              First Name
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
              className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-2.5">
              Last Name
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lastName: e.target.value }))
              }
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
            value={profile.email}
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
              value={form.mobile}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, mobile: e.target.value }))
              }
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
              value={form.currentPassword}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              className="w-full px-4 py-3 placeholder:text-gray-400 rounded-md border border-gray-200 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
            />
            <input
              type="password"
              placeholder="New Password"
              value={form.newPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="w-full px-4 py-3 placeholder:text-gray-400 rounded-md border border-gray-200 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#fdd835] focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-10 py-3.5 bg-[#fdd835] text-[#2c2c2c] font-extrabold text-[12px] tracking-widest uppercase rounded hover:bg-[#f2c713] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}