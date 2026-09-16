export type CategoryPreview = {
    id: string;
    name: string;
    slug: string;
    gender: "MEN" | "WOMEN" | "KIDS";
    audience: "Boys" | "Girls" | null;
    category_path: string;
    images: string[];
};
const apiBase = String(import.meta.env.VITE_API_BASE || "https://vandhana-shopping-mall-backend.vercel.app").replace(/\/$/, "");
const cache = new Map<number, { expires: number; rows: CategoryPreview[] }>();
const pending = new Map<number, Promise<CategoryPreview[]>>();
export const fetchCategoryPreviews = (branchId = 3): Promise<CategoryPreview[]> => {
    const hit = cache.get(branchId);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.rows);
    const running = pending.get(branchId);
    if (running) return running;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const request = fetch(`${apiBase}/api/products/category-previews?branch_id=${branchId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
    }).then(async response => {
        if (!response.ok) throw new Error("Unable to load categories");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid categories response");
        const ids = new Set<string>();
        const usedImages = new Set<string>();
        const rows: CategoryPreview[] = [];
        for (const row of data) {
            const id = String(row.id || "");
            if (!id || ids.has(id) || !row.name || !["MEN", "WOMEN", "KIDS"].includes(row.gender)) continue;
            ids.add(id);
            const images = Array.from(new Set<string>((Array.isArray(row.images) ? row.images : [])
                .filter((url: unknown): url is string => typeof url === "string" && /^https?:\/\//i.test(url) && !/placeholder/i.test(url))));
            const unusedImages = images.filter(url => !usedImages.has(url));
            unusedImages.forEach(url => usedImages.add(url));
            rows.push({ ...row, id, images: unusedImages });
        }
        cache.set(branchId, { expires: Date.now() + 60000, rows });
        return rows;
    }).finally(() => { clearTimeout(timeout); pending.delete(branchId); });
    pending.set(branchId, request);
    return request;
};
