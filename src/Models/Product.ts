export interface Product {
  id: string;
  title: string;
  description: string;
  brand?: string;

  // High-level grouping for fast filtering
  gender: "Men" | "Women" | "Kids";

  // Point to the specific leaf category (e.g., the ID for "Cargos")
  categoryId: string;

  // Pricing & Status
  price: number;
  originalPrice?: number;
  isSale?: boolean;

  // Media
  images: string[]; // Standardized naming to plural

  // Inventory & Variants
  sizes: string[];
  colors: string[];
  stockBySize: Record<string, number>;
  // Total stock can be a "getter" or calculated field to avoid sync issues

  // Technical Details
  specs: {
    material?: string;
    fit?: string;
    washCare?: string[];
  };

  // Social Proof
  ratings: {
    average: number;
    count: number;
  };

  createdAt: string; // Date stored as ISO string in JSON
}
