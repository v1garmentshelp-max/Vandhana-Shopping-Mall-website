import { Link } from "react-router";
import { FiHeart } from "react-icons/fi";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../Models/Product";

const wishlistItems: Product[] = [];

export default function Wishlist() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20 font-montserrat">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
            My Wishlist{" "}
            <span className="text-black font-semibold">
              ({wishlistItems.length})
            </span>
          </h1>
        </div>

        {wishlistItems.length > 0 ? (
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
              {wishlistItems.map((product) => (
                <div key={product.id} className="relative group">
                  <ProductCard {...product} />
                </div>
              ))}
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
