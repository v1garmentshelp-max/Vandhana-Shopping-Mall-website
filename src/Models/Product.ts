export type ProductGender = "Men" | "Women" | "Kids";

export interface ProductSpec {
  material?: string;
  fit?: string;
  washCare?: string[];
}

export interface ProductRatings {
  average: number;
  count: number;
}

export interface ProductImage {
  image_type?: string;
  image_url?: string;
  url?: string;
  secure_url?: string;
  public_id?: string;
}

export interface Product {
  id: string | number;
  productId?: string | number;
  variantId?: string | number;
  title: string;
  description: string;
  brand?: string;
  gender: ProductGender;
  categoryId: string;
  price: number;
  originalPrice?: number;
  isSale?: boolean;
  images: string[];
  frontImageUrl?: string;
  backImageUrl?: string;
  mainImageUrl?: string;
  imageUrl?: string;
  barcode?: string;
  size?: string;
  colour?: string;
  sizes: string[];
  colors: string[];
  stockBySize: Record<string, number>;
  specs: ProductSpec;
  ratings: ProductRatings;
  createdAt: string;
  onHand?: number;
  mrp?: number;
  salePrice?: number;
  patternCode?: string;
  raw?: any;
}