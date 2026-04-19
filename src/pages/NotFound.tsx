import { Link } from "react-router";
import { FiHome } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-black text-gray-200">404</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 tracking-tight">
          Page Not Found
        </h2>
        <p className="text-gray-500 mt-4 mb-8 max-w-md mx-auto text-lg pt-2">
          Oops! The page you are looking for doesn't exist. It might have been
          moved or deleted.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-bold tracking-widest text-sm uppercase rounded-sm hover:scale-105 transition-transform"
        >
          <FiHome size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
