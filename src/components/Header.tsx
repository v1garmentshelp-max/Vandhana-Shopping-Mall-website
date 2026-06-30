import React, { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Search,
  ShoppingCart,
  User,
  X,
  Truck,
  LogOut,
} from "lucide-react";
import logo from "../assets/logo.svg";
import Wrapper from "./Wrapper";
import { Link, useLocation, useNavigate } from "react-router";
import { SearchOverlay } from "./SearchOverlay";
import { CiMenuFries } from "react-icons/ci";
import men from "../assets/icons/Men.webp";
import women from "../assets/icons/Women.webp";
import kids from "../assets/icons/Kids.svg";
import { fetchCartCount } from "../services/cartApi";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
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

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(getStoredUser);

  const navItems = ["Men", "Women", "Kids", "Customize"];
  const navigate = useNavigate();
  const location = useLocation();

  const userInitial = useMemo(() => {
    const name = storedUser?.name || storedUser?.email || storedUser?.mobile || "User";
    return String(name).trim().charAt(0).toUpperCase() || "U";
  }, [storedUser]);

  const userDisplayName = useMemo(() => {
    if (!storedUser) return "Hey User";
    const name = storedUser.name || storedUser.email || storedUser.mobile || "User";
    return `Hey ${name}`;
  }, [storedUser]);

  const syncCartCount = async () => {
    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      setCartCount(0);
      return;
    }

    try {
      const count = await fetchCartCount(userId);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  const syncUser = () => {
    setStoredUser(getStoredUser());
  };

  const handleSelect = (gender: string) => {
    if (gender === "Customize") {
      setActiveLink(gender);
      setMobileMenuOpen(false);
      navigate("/customize");
      return;
    }

    const path = `/${gender.toLowerCase()}`;
    localStorage.setItem("preferred_gender", gender);
    localStorage.setItem("preferred_gender_url", path);
    setActiveLink(gender);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setStoredUser(null);
    setCartCount(0);
    setMobileMenuOpen(false);
    navigate("/auth");
  };

  useEffect(() => {
    const currentPath = location.pathname.split("/");
    const found = navItems.find(
      (item) => item.toLowerCase() === currentPath[1],
    );
    if (found) {
      setActiveLink(found);
    }
  }, [location]);

  useEffect(() => {
    const preferredGender = localStorage.getItem("preferred_gender");
    if (preferredGender) {
      setActiveLink(preferredGender);
    }
  }, []);

  useEffect(() => {
    void syncCartCount();
    syncUser();

    const handleCartUpdated = () => {
      void syncCartCount();
    };

    const handleStorage = () => {
      syncUser();
      void syncCartCount();
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="w-full z-50 font-big-shoulders sticky top-0 transition-transform duration-300">
        <div className="w-full bg-white lg:bg-white relative shadow-[0px_0px_30px_rgba(0,0,0,0.1)] border-b lg:border-gray-100 border-white px-2 py-2 lg:py-3 lg:px-12">
          <Wrapper className="px-0!">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-md p-1.5 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <CiMenuFries
                  size={26}
                  className="text-black rotate-180"
                  strokeWidth={0.5}
                />
              </button>

              <Link
                to="/"
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 lg:static lg:left-0 lg:translate-x-0 lg:top-0 lg:translate-y-0 shrink-0 flex items-center gap-2"
              >
                <img
                  src={logo}
                  alt="logo"
                  className="w-[5rem] lg:w-16 h-auto"
                />
                <h1 className="text-3xl hidden lg:flex font-bold tracking-normal text-black">
                  V1Garments
                </h1>
              </Link>

              <nav className="hidden lg:flex items-center font-poppins space-x-8">
                {navItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="relative cursor-pointer flex items-center uppercase py-2 text-[20px] font-semibold transition-colors hover:text-black text-black"
                  >
                    {item}
                    {item === activeLink && (
                      <span className="absolute bottom-1 left-0 h-[2px] w-full bg-primary" />
                    )}
                  </button>
                ))}
              </nav>

              <div className="flex items-center space-x-1.5 md:space-x-4">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative cursor-pointer p-1 hover:opacity-70 transition-opacity"
                >
                  <Search strokeWidth={1.5} className="text-black size-6" />
                </button>

                <Link
                  to="/wishlist"
                  className="relative cursor-pointer p-1 hover:opacity-70 transition-opacity"
                >
                  <Heart strokeWidth={1.5} className="text-black size-6" />
                </Link>

                <Link
                  to="/cart"
                  className="relative cursor-pointer p-1 hover:opacity-70 transition-opacity"
                >
                  <ShoppingCart
                    strokeWidth={1.5}
                    className="text-black size-6"
                  />
                  {cartCount > 0 && (
                    <span className="absolute font-poppins -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white lg:border-gray-100">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/profile"
                  className="p-1 hidden lg:block cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <User strokeWidth={1.5} className="text-black size-6" />
                </Link>
              </div>
            </div>
          </Wrapper>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 md:hidden z-99 ${
          mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div
        className={`fixed top-0 sidebar-hidden left-0 h-full font-poppins w-[85dvw] bg-white z-100 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col overflow-y-auto overflow-x-hidden p-6 gap-4 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between font-montserrat">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#f5b82e] flex items-center justify-center text-black font-semibold text-lg">
              {userInitial}
            </div>
            <span className="font-semibold text-gray-900 text-sm line-clamp-1">
              {userDisplayName}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-gray-800 p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4 mt-2 ml-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              SHOP IN
            </span>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>

          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => handleSelect("Men")}
              className="flex items-center gap-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                <img
                  src={men}
                  alt="men"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium text-gray-900 text-[15px]">Men</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("Women")}
              className="flex items-center gap-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src={women}
                  alt="women"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium text-gray-900 text-[15px]">
                Women
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("Kids")}
              className="flex items-center pl-1 gap-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="w-10 h-10">
                <img
                  src={kids}
                  alt="kids"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium text-gray-900 text-[15px]">
                Kids
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("Customize")}
              className="flex items-center pl-1 gap-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-lg">
                  C
                </div>
              </div>
              <span className="font-medium text-gray-900 text-[15px]">
                Customize
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col mt-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              MY PROFILE
            </span>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/profile"
              className="flex flex-col items-start gap-2 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-[4.2rem] h-[4.2rem] border border-gray-200 rounded-2xl flex items-center justify-center group-hover:border-[#f5b82e] transition-colors">
                <User size={26} className="text-gray-800" fill="#f5b82e" />
              </div>
              <span className="text-[11px] font-medium text-gray-900 text-center leading-tight">
                My Account
              </span>
            </Link>

            <Link
              to="/profile?tab=orders"
              className="flex flex-col items-start gap-2 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-[4.2rem] h-[4.2rem] border border-gray-200 rounded-2xl flex items-center justify-center group-hover:border-[#f5b82e] transition-colors">
                <Truck size={26} className="text-gray-800" fill="#f5b82e" />
              </div>
              <span className="text-[11px] font-medium text-gray-900 text-center leading-tight">
                My Orders
              </span>
            </Link>

            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col items-start gap-2 group"
            >
              <div className="w-[4.2rem] h-[4.2rem] border border-gray-200 rounded-2xl flex items-center justify-center group-hover:border-[#f5b82e] transition-colors">
                <Heart size={26} className="text-gray-800" fill="#f5b82e" />
              </div>
              <span className="text-[11px] font-medium text-gray-900 text-center leading-tight">
                My Wishlist
              </span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              CONTACT US
            </span>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>
          <div className="flex flex-col gap-5">
            <Link
              to="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-black text-[15px]"
            >
              Help & Support
            </Link>
            <Link
              to="/feedback"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-black text-[15px]"
            >
              Feedback & Suggestions
            </Link>
          </div>
        </div>

        {storedUser && (
          <div className="mt-auto pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-500 rounded-xl font-bold justify-start hover:bg-red-100 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[15px]">Logout</span>
            </button>
          </div>
        )}
      </div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;