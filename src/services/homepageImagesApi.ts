const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

export type HomepageImage = {
  id: string;
  page?: string | null;
  section?: string | null;
  slotOrder?: number | null;
  imageUrl?: string | null;
  defaultImageUrl?: string | null;
  altText?: string | null;
  link?: string | null;
  extra?: Record<string, any> | null;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HomepageImageMap = Record<string, HomepageImage>;

export const fetchHomepageImageMap = async (page?: string): Promise<HomepageImageMap> => {
  const query = page ? `?page=${encodeURIComponent(page)}` : "";
  const response = await fetch(`${API_BASE}/api/homepage-images${query}`, { method: "GET", cache: "no-store" });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Unable to load website posters");
  if (!Array.isArray(data)) return {};
  return data.reduce((map: HomepageImageMap, item: HomepageImage) => {
    if (item?.id) map[item.id] = item;
    return map;
  }, {});
};