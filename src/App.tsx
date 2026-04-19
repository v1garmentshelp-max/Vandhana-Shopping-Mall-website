import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Men from "./pages/Men";
import ProductDetailsPage from "./pages/ProductDetails/ProductDetailsPage";
import Collection from "./pages/Collection";
import Women from "./pages/Women";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ScrollToTop from "./components/ScrollToTop";
import Kids from "./pages/Kids";
import Customizer from "./pages/Customizer";

function AppContent() {
  const location = useLocation();
  const isCustomizePage = location.pathname.startsWith("/customize");

  useEffect(() => {
    if (isCustomizePage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isCustomizePage]);

  return (
    <>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" index element={<Home />} />
        <Route path="/men" element={<Men />} />
        <Route path="/women" element={<Women />} />
        <Route path="/kids" element={<Kids />} />
        <Route path="/customize" element={<Customizer />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/collections" element={<Collection />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isCustomizePage && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
