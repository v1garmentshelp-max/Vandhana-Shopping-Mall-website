import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { money, storeRequest, type Quote } from '../services/storefrontApi';
import '../styles/shiwang-offer.css';

type Campaign = { id: string; active: boolean; enabled: boolean; starts_at: string; ends_at: string; single_price: number; pair_price: number };
const OfferContext = createContext<Campaign | null>(null);
export function ShiwangOfferProvider({ children }: { children: ReactNode }) {
  const [offer, setOffer] = useState<Campaign | null>(null);
  const [offset, setOffset] = useState(0), [now, setNow] = useState(Date.now());
  useEffect(() => {
    let mounted = true;
    const refresh = () => storeRequest<{ server_now: string; offers: Campaign[] }>('/storefront/offers')
      .then(data => { if (mounted) { setOffer(data.offers.find(o => o.id === 'SHIWANG_PAIR_OCT2026') || null); setOffset(Date.parse(data.server_now) - Date.now()); setNow(Date.now()); } })
      .catch(() => { if (mounted) setOffer(null); });
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { mounted = false; clearInterval(interval); window.removeEventListener('focus', focus); };
  }, []);
  useEffect(() => {
    if (!offer) return;
    const boundary = now + offset < Date.parse(offer.starts_at) ? offer.starts_at : offer.ends_at;
    const delay = Date.parse(boundary) - (Date.now() + offset);
    if (delay <= 0) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), Math.min(delay + 25, 2147483647));
    return () => clearTimeout(timeout);
  }, [offer, offset, now]);
  const active = offer?.enabled && now + offset >= Date.parse(offer.starts_at) && now + offset < Date.parse(offer.ends_at);
  return <OfferContext.Provider value={offer ? { ...offer, active: !!active } : null}>{children}</OfferContext.Provider>;
}
export function isBusinessCustomer() {
  try { const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}'); return ['B2B', 'BUSINESS', 'WHOLESALE'].includes(String(u.type || u.userType || u.user_type || u.customer_type || u.role || '').toUpperCase()); }
  catch { return false; }
}
export function useShiwangOffer(product?: any) {
  const campaign = useContext(OfferContext);
  return campaign?.active && !isBusinessCustomer() && (!product || product.offer?.id === campaign.id) ? campaign : null;
}
export function ShiwangBanner() {
  const offer = useShiwangOffer();
  return offer ? <Link to="/offers/shiwang" className="shiwang-strip"><strong>SHIWANG</strong><span>Kurthi Pant Sets · 1 for ₹990 · 2 for ₹1,599</span><span>Until 20 Oct · Shop offer →</span></Link> : null;
}
export function ShiwangProductOffer({ product, compact = false }: { product: any; compact?: boolean }) {
  const offer = useShiwangOffer(product);
  if (!offer) return null;
  return compact ? <p className="shiwang-badge">Any 2 for ₹1,599 · Till 20 Oct</p> : <div className="shiwang-note"><strong>Shiwang pair offer</strong><p>1 set ₹990 · 2 sets ₹1,599 · 3 sets ₹2,589 · 4 sets ₹3,198</p><p>Mix eligible styles, sizes and colours. Applied automatically in your bag.</p><small>Valid through 20 October 2026, 11:59 p.m. IST. Delivery / COD charges are extra where applicable.</small></div>;
}
export function ShiwangQuoteOffer({ quote }: { quote: Quote | null }) {
  const offer = quote?.offers?.find(o => o.id === 'SHIWANG_PAIR_OCT2026');
  if (!offer) return null;
  return <div className="shiwang-note" role="status"><strong>Shiwang offer applied · {offer.quantity} set{offer.quantity === 1 ? '' : 's'}</strong><p>{offer.pairs > 0 ? `${offer.pairs} pair${offer.pairs === 1 ? '' : 's'} × ₹1,599` : ''}{offer.pairs > 0 && offer.singles ? ' + ' : ''}{offer.singles ? '1 set × ₹990' : ''} = <b>{money(offer.subtotal)}</b></p>{offer.discount > 0 ? <p>You save {money(offer.discount)} with the pair offer.</p> : <p>Add one more eligible set to get two for ₹1,599.</p>}<small>Offer savings are included in your subtotal. Delivery and rewards are shown separately.</small></div>;
}
