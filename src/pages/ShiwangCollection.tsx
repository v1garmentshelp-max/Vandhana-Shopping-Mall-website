import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useShiwangOffer } from '../components/ShiwangOffer';
import { fetchProductsByGender } from '../services/productsApi';
import type { Product } from '../Models/Product';
export default function ShiwangCollection() {
  const offer = useShiwangOffer();
  const [products,setProducts] = useState<Product[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [retry,setRetry] = useState(0);
  useEffect(() => { let active = true; setLoading(true); setError(''); fetchProductsByGender('Women').then(data => { if (active) setProducts(data.filter(p => p.offer?.id === 'SHIWANG_PAIR_OCT2026')); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [retry]);
  return <main className="shiwang-page"><Link to="/women">← Women’s collection</Link><h1>Shiwang Kurthi Pant Sets</h1>{offer ? <><p>Pick your favourites. Mix styles, sizes and colours.</p><div className="shiwang-prices"><span>1 set<b>₹990</b></span><span>2 sets<b>₹1,599</b></span><span>3 sets<b>₹2,589</b></span><span>4 sets<b>₹3,198</b></span></div><p>Every pair ₹1,599, every extra single ₹990. Automatically applied in your bag.</p><p>Through 20 October 2026, 11:59 p.m. IST. Retail orders only. Delivery and COD charges are extra where applicable.</p></> : <p>Current product prices are shown below. The pair offer is available only during its active dates for retail customers.</p>}{loading && <p role="status">Loading Shiwang styles…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(n => n + 1)}>Try again</button></div>}{!loading && !error && products.length === 0 && <p>No eligible sets are currently available.</p>}<div className="shiwang-products">{products.map(p => <ProductCard key={String(p.routeKey || p.id)} {...p}/>)}</div></main>;
}
