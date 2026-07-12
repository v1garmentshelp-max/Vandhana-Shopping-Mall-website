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
  product_id?: string | number;
  variantId?: string | number;
  variant_id?: string | number;
  primaryVariantId?: string | number;
  primary_variant_id?: string | number;
  title: string;
  name?: string;
  product_name?: string;
  description: string;
  brand?: string;
  brand_name?: string;
  gender: ProductGender;
  category?: ProductGender;
  categoryId: string;
  category_id?: string;
  categoryName?: string;
  category_name?: string;
  categorySlug?: string;
  category_slug?: string;
  parentCategoryId?: string;
  parent_category_id?: string;
  parentCategoryName?: string;
  parent_category_name?: string;
  parentCategorySlug?: string;
  parent_category_slug?: string;
  categoryPath?: string;
  category_path?: string;
  price: number;
  originalPrice?: number;
  original_price?: number;
  original_price_b2c?: number;
  final_price_b2c?: number;
  salePrice?: number;
  sale_price?: number;
  selling_price?: number;
  discounted_price?: number;
  mahaveer_price?: number;
  discount?: number;
  discount_b2c?: number;
  discount_percentage?: number;
  discount_percent?: number;
  b2c_discount_pct?: number;
  isSale?: boolean;
  images: string[];
  frontImageUrl?: string;
  front_image_url?: string;
  backImageUrl?: string;
  back_image_url?: string;
  mainImageUrl?: string;
  main_image_url?: string;
  imageUrl?: string;
  image_url?: string;
  barcode?: string;
  ean_code?: string;
  eanCode?: string;
  size?: string;
  colour?: string;
  color?: string;
  selectedColor?: string;
  selected_color?: string;
  selectedColour?: string;
  selected_colour?: string;
  sizes: string[];
  allSizes?: string[];
  all_sizes?: string[];
  colors: string[];
  colours?: string[];
  stockBySize: Record<string, number>;
  specs: ProductSpec;
  ratings: ProductRatings;
  createdAt: string;
  created_at?: string;
  onHand?: number;
  on_hand?: number;
  available_qty?: number;
  availableQty?: number;
  mrp?: number;
  patternCode?: string;
  pattern_code?: string;
  variants?: any[];
  colorVariants?: any[];
  color_variants?: any[];
  variantCount?: number;
  variant_count?: number;
  colorVariantCount?: number;
  color_variant_count?: number;
  raw?: any;
}