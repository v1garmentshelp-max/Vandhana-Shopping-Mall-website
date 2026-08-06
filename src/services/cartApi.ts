const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

export type CartApiItem = {
  cart_item_id?: number;
  user_id?: number;
  id: string | number;
  product_id?: number | string | null;
  productId?: number | string | null;
  variant_id?: number | string | null;
  variantId?: number | string | null;
  design_code?: string | null;
  designCode?: string | null;
  pattern_type?: string | null;
  patternType?: string | null;
  pattern_code?: string | null;
  patternCode?: string | null;
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
  b2c_discount_pct?: number | string | null;
  b2b_discount_pct?: number | string | null;
  image_url?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  main_image_url?: string | null;
  images?: string[] | string | null;
  ean_code?: string | null;
  barcode?: string | null;
  on_hand?: number | string | null;
  weight?: number | string | null;
  weight_kg?: number | string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  hsn_code?: string | null;
  hsnCode?: string | null;
  hsn_percentage?: number | string | null;
  hsnPercentage?: number | string | null;
  is_custom?: boolean;
  custom_payload?: any;
};

export type AddCartPayload = {
  user_id: number;
  product_id?: number | string | null;
  variant_id?: number | string | null;
  design_code?: string | null;
  pattern_type?: string | null;
  pattern_code?: string | null;
  ean_code?: string | null;
  selected_size: string;
  selected_color: string;
  quantity?: number;
  image_url?: string | null;
  weight?: number | null;
  weight_kg?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  hsn_code?: string | null;
  hsn_percentage?: number | null;
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

const text = (value: any) => String(value ?? "").trim();

const numberOrNull = (value: any) => {
  if (value === null || value === undefined || text(value) === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeImages = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => text(item?.image_url || item?.imageUrl || item?.url || item))
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeImages(parsed);
  } catch {
    return [value.trim()];
  }
};

const normalizeCartItem = (item: any): CartApiItem => {
  const productId = item?.product_id ?? item?.productId ?? null;
  const variantId = item?.variant_id ?? item?.variantId ?? item?.stored_variant_id ?? null;
  const designCode = text(item?.design_code || item?.designCode || "");
  const patternType = text(item?.pattern_type || item?.patternType || "");
  const patternCode = text(item?.pattern_code || item?.patternCode || "");
  const selectedSize = text(item?.selected_size || item?.size || "");
  const selectedColor = text(item?.selected_color || item?.colour || item?.color || "");
  const barcode = text(item?.ean_code || item?.eanCode || item?.barcode || "");
  const images = normalizeImages(item?.images);
  const frontImage = text(item?.front_image_url || item?.frontImageUrl || item?.image_url || item?.imageUrl || images[0] || "");
  const backImage = text(item?.back_image_url || item?.backImageUrl || images[1] || "");
  const customPayload = item?.custom_payload && typeof item.custom_payload === "object" ? item.custom_payload : {};

  return {
    ...item,
    id: item?.id ?? variantId ?? item?.cart_item_id ?? "",
    product_id: productId,
    productId,
    variant_id: variantId,
    variantId,
    design_code: designCode || null,
    designCode: designCode || null,
    pattern_type: patternType || null,
    patternType: patternType || null,
    pattern_code: patternCode || null,
    patternCode: patternCode || null,
    product_name: text(item?.product_name || item?.productName || item?.name || "Product"),
    selected_size: selectedSize,
    selected_color: selectedColor,
    size: selectedSize,
    colour: selectedColor,
    color: selectedColor,
    quantity: Math.max(1, Number(item?.quantity || 1) || 1),
    original_price_b2c: numberOrNull(item?.original_price_b2c),
    final_price_b2c: numberOrNull(item?.final_price_b2c),
    original_price_b2b: numberOrNull(item?.original_price_b2b),
    final_price_b2b: numberOrNull(item?.final_price_b2b),
    b2c_discount_pct: numberOrNull(item?.b2c_discount_pct),
    b2b_discount_pct: numberOrNull(item?.b2b_discount_pct),
    image_url: frontImage || null,
    front_image_url: frontImage || null,
    back_image_url: backImage || null,
    main_image_url: text(item?.main_image_url || item?.mainImageUrl || frontImage) || null,
    images,
    ean_code: barcode || null,
    barcode: barcode || null,
    on_hand: numberOrNull(item?.on_hand),
    weight: numberOrNull(item?.weight ?? customPayload?.weight),
    weight_kg: numberOrNull(item?.weight_kg ?? customPayload?.weight_kg ?? item?.weight),
    length: numberOrNull(item?.length ?? customPayload?.length),
    width: numberOrNull(item?.width ?? customPayload?.width),
    height: numberOrNull(item?.height ?? customPayload?.height),
    hsn_code: text(item?.hsn_code || item?.hsnCode || customPayload?.hsn_code || "") || null,
    hsnCode: text(item?.hsn_code || item?.hsnCode || customPayload?.hsn_code || "") || null,
    hsn_percentage: numberOrNull(item?.hsn_percentage ?? item?.hsnPercentage ?? customPayload?.hsn_percentage),
    hsnPercentage: numberOrNull(item?.hsn_percentage ?? item?.hsnPercentage ?? customPayload?.hsn_percentage),
    custom_payload: customPayload,
  };
};

const notifyCartUpdated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("cart-updated"));
  window.dispatchEvent(new Event("cartUpdated"));
};

const exactVariantId = (payload: {
  variant_id?: number | string | null;
  product_id?: number | string | null;
}) => payload.variant_id ?? payload.product_id ?? null;

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
  return Array.isArray(data) ? data.map(normalizeCartItem) : [];
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
  const variantId = exactVariantId(payload);

  if (!payload.is_custom && !variantId) {
    throw new Error("Exact variant_id is required to add this product to cart");
  }

  const physicalMetadata = {
    design_code: payload.design_code || null,
    pattern_type: payload.pattern_type || null,
    pattern_code: payload.pattern_code || null,
    ean_code: payload.ean_code || null,
    image_url: payload.image_url || null,
    weight: payload.weight ?? null,
    weight_kg: payload.weight_kg ?? payload.weight ?? null,
    length: payload.length ?? null,
    width: payload.width ?? null,
    height: payload.height ?? null,
    hsn_code: payload.hsn_code || null,
    hsn_percentage: payload.hsn_percentage ?? null,
  };

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: payload.product_id ?? null,
      variant_id: variantId,
      custom_payload: payload.is_custom
        ? payload.custom_payload
        : {
            ...(payload.custom_payload || {}),
            ...physicalMetadata,
          },
    }),
  });

  const data = await readJson(res);
  notifyCartUpdated();
  return data;
};

export const updateCartQuantity = async (payload: UpdateCartPayload) => {
  const variantId = exactVariantId(payload);

  if (!variantId && !payload.cart_item_id) {
    throw new Error("variant_id or cart_item_id is required to update cart quantity");
  }

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: payload.product_id ?? null,
      variant_id: variantId,
    }),
  });

  const data = await readJson(res);
  notifyCartUpdated();
  return data;
};

export const removeFromCart = async (payload: RemoveCartPayload) => {
  const variantId = exactVariantId(payload);

  if (!variantId && !payload.cart_item_id) {
    throw new Error("variant_id or cart_item_id is required to remove a cart item");
  }

  const res = await fetch(`${API_BASE}/api/cart/vandana-cart`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      product_id: payload.product_id ?? null,
      variant_id: variantId,
    }),
  });

  const data = await readJson(res);
  notifyCartUpdated();
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
  notifyCartUpdated();
  return data;
};
