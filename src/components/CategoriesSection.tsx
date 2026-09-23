import "../styles/mobile-ui.css";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, ShoppingBag } from "lucide-react";
import Wrapper from "./Wrapper";
import { fetchCategoryPreviews, type CategoryPreview } from "../services/categoryPreviews";

const CategoryTile = ({ category }: { category: CategoryPreview }) => {
    const options = [...new Set(category.images.flatMap(url => /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\//.test(url)
        ? [url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_480,c_limit/"), url] : [url]))];
    const [index, setIndex] = useState(0);
    const src = options[index];
    const gender = category.gender[0] + category.gender.slice(1).toLowerCase();
    const query = new URLSearchParams({ gender, category_id: category.id });
    return <Link to={`/collections?${query}`} className="relative block min-w-0 overflow-hidden rounded-2xl aspect-3/4 bg-[#f5f1e8] shadow-sm">
        {src ? <img key={src} src={src} alt={category.name} loading="lazy" decoding="async" width={480} height={640}
            className="absolute inset-0 h-full w-full object-cover object-top" onError={() => setIndex(value => value + 1)} />
            : <div className="absolute inset-0 flex items-center justify-center text-stone-400"><ShoppingBag size={40} /></div>}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-3 right-3 flex items-center justify-between gap-2 text-white">
            <span className="font-big-shoulders uppercase font-extrabold text-lg md:text-2xl">{category.name}</span><ChevronRight size={20} />
        </div>
    </Link>;
};
const CategoriesSection = ({ title = "Shop by Category", gender, audience }: {
    title?: string; gender: "MEN" | "WOMEN" | "KIDS"; audience?: string;
}) => {
    const [rows, setRows] = useState<CategoryPreview[]>([]);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true); setError(false);
        fetchCategoryPreviews().then(data => { if (active) setRows(data); })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    const visible = rows.filter(row => row.gender === gender && (!audience || row.audience?.toLowerCase() === audience.toLowerCase()));
    return <section className="v1-categories w-full bg-white py-6 md:py-12 px-3 md:px-6"><Wrapper className="px-0!">
        <h2 className="font-big-shoulders text-3xl md:text-5xl font-black uppercase mb-5">{title}<span className="text-yellow-400">.</span></h2>
        {loading && <p role="status">Loading categories…</p>}
        {error && <div role="status"><p>Unable to load categories.</p><button type="button" className="border rounded px-4 py-2 mt-2" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
        {!loading && !error && <div className="v1-category-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {visible.map(category => <CategoryTile key={`${category.id}:${category.images.join('|')}`} category={category} />)}
        </div>}
    </Wrapper></section>;
};
export default CategoriesSection;
