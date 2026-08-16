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

export type HomepageSectionSetting = {
  page: string;
  section: string;
  enabled: boolean;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HomepageSectionSettingsMap = Record<string, boolean>;

export type HomepageConfiguration = {
  images: HomepageImageMap;
  settings: HomepageSectionSettingsMap;
};

const configurationCache = new Map<string, HomepageConfiguration>();
const configurationRequests = new Map<string, Promise<HomepageConfiguration>>();

const readJson = async (response: Response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Unable to load website posters");
  return data;
};

export const fetchHomepageConfiguration = async (page?: string): Promise<HomepageConfiguration> => {
  const cacheKey = String(page || "all").toLowerCase();
  const cached = configurationCache.get(cacheKey);
  if (cached) return cached;

  const pending = configurationRequests.get(cacheKey);
  if (pending) return pending;

  const query = page ? `?page=${encodeURIComponent(page)}` : "";
  const request = Promise.all([
    fetch(`${API_BASE}/api/homepage-images${query}`, { method: "GET", cache: "no-store" }).then(readJson),
    fetch(`${API_BASE}/api/homepage-images/settings${query}`, { method: "GET", cache: "no-store" }).then(readJson)
  ]).then(([imagesData, settingsData]) => {
    const images = Array.isArray(imagesData)
      ? imagesData.reduce((map: HomepageImageMap, item: HomepageImage) => {
          if (item?.id) map[item.id] = item;
          return map;
        }, {})
      : {};

    const settings = Array.isArray(settingsData)
      ? settingsData.reduce((map: HomepageSectionSettingsMap, item: HomepageSectionSetting) => {
          if (item?.page && item?.section) map[`${item.page}.${item.section}`] = item.enabled !== false;
          return map;
        }, {})
      : {};

    const configuration = { images, settings };
    configurationCache.set(cacheKey, configuration);
    configurationRequests.delete(cacheKey);
    return configuration;
  }).catch(error => {
    configurationRequests.delete(cacheKey);
    throw error;
  });

  configurationRequests.set(cacheKey, request);
  return request;
};

export const fetchHomepageImageMap = async (page?: string): Promise<HomepageImageMap> => {
  const configuration = await fetchHomepageConfiguration(page);
  return configuration.images;
};

export const clearHomepageConfigurationCache = (page?: string) => {
  if (page) {
    configurationCache.delete(String(page).toLowerCase());
    return;
  }
  configurationCache.clear();
};