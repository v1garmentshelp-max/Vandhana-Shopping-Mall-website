const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

export type CartApiItem = {
  cart_item_id?: number;
  user_id?: number;
  id: string | number;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  product_name: string;
  brand?: string;
  gender?: string;
  color?: string;
  colour?: string;
  size?: string;
  selected_size: string;
  selected_color: string;
  quantity: number;
  original_price_b2c?: number | string | null;
  final_price_b2c?: number | string | null;
  original_price_b2b?: number | string | null;
  final_price_b2b?: number | string | null;
  image_url?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  main_image_url?: string | null;
  images?: string[] | string | null;
  ean_code?: string | null;
  on_hand?: number | string | null;
  is_custom?: boolean;
  custom_payload?: any;
};

export type AddCartPayload = {
  user_id: number;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  selected_size: string;
  selected_color: string;
  quantity?: number;
  is_custom?: boolean;
  custom_title?: string;
  custom_brand?: string;
  custom_image_url?: string;
  custom_price?: number;
  custom_original_price?: number;
  custom_payload?: any;
};

export type UpdateCartPayload = {
  cart_item_id?: number;
  user_id: number;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  selected_size?: string;
  selected_color?: string;
  quantity: number;
};

export type RemoveCartPayload = {
  cart_item_id?: number;
  user_id: number;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  selected_size?: string;
  selected_color?: string;
};

const readJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const fetchCart = async (userId: number, branchId = 3): Promise<CartApiItem[]> => {
  const res = await fetch(
    `${API_BASE}/api/cart/${encodeURIComponent(userId)}?branch_id=${encodeURIComponent(branchId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = await readJson(res);
  return Array.isArray(data) ? data : [];
};

export const fetchCartCount = async (userId: number): Promise<number> => {
  const res = await fetch(`${API_BASE}/api/cart/count/${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await readJson(res);
  return Number(data?.count || 0);
};

export const addToCart = async (payload: AddCartPayload) => {
  const variantId = payload.variant_id || payload.product_id;

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: variantId,
      variant_id: variantId,
    }),
  });

  const data = await readJson(res);
  window.dispatchEvent(new Event("cart-updated"));
  return data;
};

export const updateCartQuantity = async (payload: UpdateCartPayload) => {
  const variantId = payload.variant_id || payload.product_id;

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: variantId,
      variant_id: variantId,
    }),
  });

  const data = await readJson(res);
  window.dispatchEvent(new Event("cart-updated"));
  return data;
};

export const removeFromCart = async (payload: RemoveCartPayload) => {
  const variantId = payload.variant_id || payload.product_id;

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: variantId,
      variant_id: variantId,
    }),
  });

  const data = await readJson(res);
  window.dispatchEvent(new Event("cart-updated"));
  return data;
};

export const clearCart = async (userId: number) => {
  const res = await fetch(`${API_BASE}/api/cart/${encodeURIComponent(userId)}/clear`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await readJson(res);
  window.dispatchEvent(new Event("cart-updated"));
  return data;
};