import { Navigate } from "react-router";
import ShopByCategory from "../components/ShopByCategory";

const Home = () => {
  const redirectUrl =
    typeof window !== "undefined"
      ? localStorage.getItem("preferred_gender_url")
      : null;

  if (redirectUrl) {
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <div className="w-full bg-white">
      <ShopByCategory />
    </div>
  );
};

export default Home;