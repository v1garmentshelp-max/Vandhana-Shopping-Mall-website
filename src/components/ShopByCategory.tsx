import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ShoppingBag } from "lucide-react";
import Wrapper from "./Wrapper";
import KidsImage from "../assets/kids.jpeg";
import { fetchCategoryPreviews, type CategoryPreview } from "../services/categoryPreviews";
import "./ShopByCategory.css";

type Gender = "Men" | "Women" | "Kids";
const covers: Record<Gender, string> = {
    Men: "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555eb738d1f865fb32b1a_1.jpeg",
    Women: "https://cdn.prod.website-files.com/68d5557e8cbe8b50de16449b/68d555e49a2cdcab119ad9b2_2.jpeg",
    Kids: KidsImage,
};
const sections = [
    { key: "men", title: "Men", gender: "MEN", audience: null },
    { key: "women", title: "Women", gender: "WOMEN", audience: null },
    { key: "boys", title: "Kids Boys", gender: "KIDS", audience: "Boys" },
    { key: "girls", title: "Kids Girls", gender: "KIDS", audience: "Girls" },
];
const imageOptions = (images: string[]) => Array.from(new Set(images.flatMap(url => {
    if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\//.test(url)) {
        return [url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_480,c_limit/'), url];
    }
    return [url];
})));
const Tile = ({ title, subtitle, images, onClick, cover = false, kids = false }: {
    title: string; subtitle: string; images: string[]; onClick: () => void; cover?: boolean; kids?: boolean;
}) => {
    const options = imageOptions(images);
    const [index, setIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const src = options[index];
    return <button type="button" onClick={onClick} className={`v1-home-tile ${cover ? 'v1-home-cover' : ''} ${kids ? 'v1-home-kids-cover' : ''} ${src && loaded ? 'v1-home-with-image' : ''}`} aria-label={`Shop ${title}`}>
        <span className="v1-home-art" aria-hidden="true"><ShoppingBag size={32} strokeWidth={1.2} /></span>
        {src ? <img key={src} src={src} alt="" loading={cover ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setIndex(value => value + 1); }} style={{ opacity: loaded ? 1 : 0 }} /> : null}
        <span className="v1-home-shade" />
        <span className="v1-home-tile-text"><strong>{title}</strong><span>{subtitle}<ChevronRight size={16} /></span></span>
    </button>;
};
const ShopByCategory: React.FC = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<CategoryPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(false);
        fetchCategoryPreviews().then(data => { if (active) setRows(data); })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    const selectGender = (gender: Gender) => {
        const route = `/${gender.toLowerCase()}`;
        localStorage.setItem("preferred_gender", gender);
        localStorage.setItem("preferred_gender_url", route);
        navigate(route);
    };
    const selectCategory = (category: CategoryPreview) => {
        const gender = category.gender.charAt(0) + category.gender.slice(1).toLowerCase();
        const query = new URLSearchParams({ gender, category_id: category.id });
        navigate(`/collections?${query.toString()}`);
    };
    return <section className="v1-home-shop"><Wrapper>
        <h1 className="v1-home-heading font-big-shoulders">Shop by category<span>.</span></h1>
        <div className="v1-home-covers">
            {(["Men", "Women", "Kids"] as Gender[]).map(gender => <Tile key={gender} title={gender} subtitle={gender === "Kids" ? "Explore collection" : "Shop collection"} images={[covers[gender]]} onClick={() => selectGender(gender)} cover kids={gender === "Kids"} />)}
        </div>
        {loading ? <p className="v1-home-status" role="status">Loading categories…</p> : null}
        {error ? <div className="v1-home-status" role="status"><p>Categories could not load. You can still browse Men, Women or Kids above.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : null}
        {!loading && !error ? sections.map(section => {
            const categories = rows.filter(row => row.gender === section.gender && String(row.audience || '').toLowerCase() === String(section.audience || '').toLowerCase());
            if (!categories.length) return null;
            return <section key={section.key} className="v1-home-category-section" aria-labelledby={`v1-home-${section.key}`}>
                <h2 id={`v1-home-${section.key}`} className="v1-home-heading font-big-shoulders">{section.title} categories<span>.</span></h2>
                <div className="v1-home-category-grid">{categories.map(category => <Tile key={`${category.id}:${category.images.join('|')}`} title={category.name} subtitle="Shop now" images={category.images} onClick={() => selectCategory(category)} />)}</div>
            </section>;
        }) : null}
    </Wrapper></section>;
};
export default ShopByCategory;
