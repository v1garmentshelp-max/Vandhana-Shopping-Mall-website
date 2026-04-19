export interface Category {
  id: string;
  name: string; // "Men", "Topwear", or "Cargos"
  slug: string; // "men-bottomwear-cargos" (Critical for SEO URLs)
  image?: string;

  // Link to the parent. Level 0 categories (Men/Women) will have null.
  parentId: string | null;

  // Helps logic: 0 = Gender, 1 = Department (Topwear), 2 = Product Type (T-shirt)
  level: number;
}
