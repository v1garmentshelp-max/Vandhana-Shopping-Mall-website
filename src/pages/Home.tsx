import { Navigate } from "react-router";
import ShopByCategory from "../components/ShopByCategory";

const GENDER_ROUTES = new Set(["/men", "/women", "/kids"]);

const Home = () => {
  const savedRoute = String(
    localStorage.getItem("preferred_gender_url") || "",
  )
    .trim()
    .toLowerCase();

  if (GENDER_ROUTES.has(savedRoute)) {
    return <Navigate to={savedRoute} replace />;
  }

  return (
    <div className="w-full bg-white">
      <ShopByCategory />
    </div>
  );
};

export default Home;
