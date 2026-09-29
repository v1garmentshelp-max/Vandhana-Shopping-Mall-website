import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { customerToken, money, notifyCommerceChanged, payForCheckout, postStore, StoreError, storeRequest } from '../services/storefrontApi';
import type { Checkout as SavedCheckout, Quote } from '../services/storefrontApi';
import '../styles/commerce.css';
type Address = { fullName: string; mobile: string; line1: string; line2: string; city: string; state: string; pincode: string };
type Attempt = { request_key: string; address: Address; payment_method: 'COD' | 'ONLINE'; reward_points: number; fingerprint: string; quote_version: number };
export default function Checkout() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [address, setAddress] = useState<Address>({ fullName: '', mobile: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const [method, setMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [points, setPoints] = useState(0), [pointsInput, setPointsInput] = useState('');
  const [wallet, setWallet] = useState<any>(null), [walletError, setWalletError] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null), [quoteLoading, setQuoteLoading] = useState(true);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [quoteError, setQuoteError] = useState('');
  const [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null), [recoveryError, setRecoveryError] = useState(false);
  const running = useRef(false);
  const keyFor = (id: number) => `v1:website-checkout:${id}`;
  useEffect(() => {
    let active = true;
    if (!customerToken()) { setLoading(false); setQuoteLoading(false); return; }
    storeRequest('/auth/me').then(data => {
      const user = data.user || data;
      if (!active) return;
      setCustomer(user); setAddress(prev => ({ ...prev, fullName: user.name || '', mobile: user.mobile || '' }));
      try { const raw = localStorage.getItem(keyFor(user.id)); if (raw) { const saved = JSON.parse(raw); if (!saved?.request_key || !saved?.address || !saved?.fingerprint) throw new Error('Invalid checkout'); setAttempt(saved); } }
      catch { setRecoveryError(true); setError('The saved checkout could not be read. Check My Orders and contact the store before starting another order.'); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!customer) return;
    const controller = new AbortController(); setQuoteLoading(true); setQuoteError('');
    storeRequest<Quote>('/storefront/checkout/quote', { method: 'POST', body: JSON.stringify({ payment_method: method, reward_points: points, quote_version: 2 }), signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setQuote(data); })
      .catch(e => { if (!controller.signal.aborted) { setQuote(null); setQuoteError(e.message); } })
      .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    return () => controller.abort();
  }, [customer, method, points, refresh]);
  useEffect(() => {
    if (!customer) return;
    let active = true;
    storeRequest('/rewards/wallet').then(data => { if (active) { setWallet(data); setWalletError(''); } }).catch(e => { if (active) setWalletError(e.message); });
    return () => { active = false; };
  }, [customer, refresh]);
  const applyPoints = () => {
    const requested = Number(pointsInput);
    if (!Number.isSafeInteger(requested) || requested < 0 || requested > Number(wallet?.balance || 0)) { setError('Enter whole reward points within your available balance.'); return; }
    if (requested > Math.floor(quote?.subtotal || 0)) { setError('Rewards can cover the product subtotal. Delivery and COD charges are paid separately.'); return; }
    setError(''); setPoints(requested);
  };
  const submit = async (resume = false) => {
    if (running.current || !customer || recoveryError) return;
    if (!resume && (!quote || quoteLoading || quote.payment_method !== method || quote.reward_points !== points)) return;
    if (!resume && attempt) { setError('Resume your saved checkout first to avoid creating a duplicate order.'); return; }
    let payload = resume ? attempt : null;
    if (!payload) {
      if (address.fullName.trim().length < 2 || address.line1.trim().length < 5 || !address.city.trim() || !address.state.trim() || !/^[6-9]\d{9}$/.test(address.mobile) || !/^[1-9]\d{5}$/.test(address.pincode)) { setError('Enter a complete delivery address, a valid 10-digit Indian mobile number and 6-digit pincode.'); return; }
      payload = { request_key: crypto.randomUUID(), address, payment_method: method, reward_points: points, fingerprint: quote!.fingerprint, quote_version: 2 };
      try { localStorage.setItem(keyFor(customer.id), JSON.stringify(payload)); setAttempt(payload); }
      catch { setError('Enable browser storage so your order can be recovered if the connection drops.'); return; }
    }
    running.current = true; setBusy(true); setError('');
    let saved: SavedCheckout | null = null;
    try {
      saved = await postStore<SavedCheckout>('/storefront/checkouts', payload);
      localStorage.removeItem(keyFor(customer.id)); setAttempt(null); notifyCommerceChanged();
      if (saved.payment_method === 'ONLINE' && !saved.fully_paid) await payForCheckout(saved.key, customer);
      navigate(`/orders/${saved.sale_id}?placed=1`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Your order needs checking. Please try again.';
      if (saved) navigate(`/orders/${saved.sale_id}`, { state: { message } });
      else { setError(message); if (e instanceof StoreError && e.checkoutNotCreated) { localStorage.removeItem(keyFor(customer.id)); setAttempt(null); setRefresh(n => n + 1); } }
    } finally { running.current = false; setBusy(false); }
  };
  if (loading) return <main className="v1-commerce"><div className="v1-commerce-wrap" role="status"><span className="v1-commerce-loader" />Loading secure checkout...</div></main>;
  if (!customer) return <main className="v1-commerce"><div className="v1-commerce-wrap v1-commerce-card"><h1>Sign in to checkout</h1><p>Your cart, rewards and orders stay with your account.</p>{error && <p role="alert" className="v1-commerce-alert">{error}</p>}<Link className="v1-commerce-primary" to="/auth">Sign in or create an account</Link></div></main>;
  const fields: { key: keyof Address; label: string; autocomplete: string; max?: number; wide?: boolean; optional?: boolean }[] = [
    { key: 'fullName', label: 'Full name', autocomplete: 'name' }, { key: 'mobile', label: 'Mobile number', autocomplete: 'tel-national', max: 10 },
    { key: 'line1', label: 'House number, building and street', autocomplete: 'address-line1', wide: true }, { key: 'line2', label: 'Area or landmark (optional)', autocomplete: 'address-line2', wide: true, optional: true },
    { key: 'city', label: 'City', autocomplete: 'address-level2' }, { key: 'state', label: 'State', autocomplete: 'address-level1' }, { key: 'pincode', label: 'Pincode', autocomplete: 'postal-code', max: 6 },
  ];
  return <main className="v1-commerce"><div className="v1-commerce-wrap">
    <Link to="/cart">← Back to your cart</Link><h1>Make it yours.</h1><p className="v1-commerce-muted">Confirm your address, choose payment and review the final total.</p>
    {error && <p className="v1-commerce-alert" role="alert">{error}</p>}
    {attempt && <div className="v1-commerce-note"><strong>You have a saved checkout.</strong><p>Resume the same request to check whether your order was placed. This prevents duplicate orders.</p><div className="v1-commerce-actions"><button className="v1-commerce-primary" disabled={busy} onClick={() => void submit(true)}>{busy ? 'Checking...' : 'Resume saved checkout'}</button><Link to="/profile?tab=orders">View my orders</Link></div></div>}
    <div className="v1-commerce-grid"><div className="v1-commerce-stack">
      <section className="v1-commerce-card"><h2>1. Delivery address</h2><div className="v1-commerce-fields">{fields.map(field => <label key={field.key} className={field.wide ? 'v1-commerce-wide' : ''}>{field.label}<input autoComplete={field.autocomplete} required={!field.optional} maxLength={field.max || 250} inputMode={field.max ? 'numeric' : 'text'} value={address[field.key]} disabled={busy || !!attempt} onChange={event => setAddress(prev => ({ ...prev, [field.key]: field.max ? event.target.value.replace(/\D/g, '') : event.target.value }))} /></label>)}</div><p className="v1-commerce-muted">Order updates: {customer.email}</p></section>
      <section className="v1-commerce-card"><h2>2. Payment method</h2><div className="v1-commerce-payments"><button disabled={busy || !!attempt} aria-pressed={method === 'ONLINE'} onClick={() => setMethod('ONLINE')}><strong>Pay online</strong><small>UPI, cards and netbanking through Razorpay</small></button><button disabled={busy || !!attempt} aria-pressed={method === 'COD'} onClick={() => setMethod('COD')}><strong>Cash on delivery</strong><small>COD charge is included in your total</small></button></div><p className="v1-commerce-muted">Delivery is calculated on the product subtotal before reward redemption.</p></section>
      <section className="v1-commerce-card"><h2>3. Your rewards</h2>{walletError ? <div className="v1-commerce-alert" role="alert">{walletError}<button className="v1-commerce-secondary" onClick={() => setRefresh(n => n + 1)}>Retry rewards</button></div> : !wallet ? <p role="status">Loading your points...</p> : !wallet.enabled ? <p>Reward redemption is currently switched off by the store.</p> : <><p><strong>{Number(wallet.balance).toLocaleString('en-IN')} points available</strong> · 1 point = ₹1</p><label>Points to use<input inputMode="numeric" value={pointsInput} disabled={busy || !!attempt} onChange={e => setPointsInput(e.target.value.replace(/\D/g, ''))} /></label><div className="v1-commerce-actions"><button className="v1-commerce-secondary" disabled={busy || !!attempt || quoteLoading} onClick={applyPoints}>Apply points</button>{points > 0 && <button className="v1-commerce-secondary" disabled={busy || !!attempt} onClick={() => { setPoints(0); setPointsInput(''); }}>Remove points</button>}</div>{wallet.nearest_expiry && <p className="v1-commerce-muted">Next expiry: {new Date(wallet.nearest_expiry).toLocaleDateString('en-IN')}. Rewards apply to products.</p>}</>}</section>
    </div><aside className="v1-commerce-card" aria-busy={quoteLoading}><h2>Your order</h2>
      {quoteError && <div className="v1-commerce-alert" role="alert"><p>{quoteError}</p><div className="v1-commerce-actions"><button className="v1-commerce-secondary" onClick={() => { if (points) { setPoints(0); setPointsInput(''); } setRefresh(n => n + 1); }}>Refresh total</button><Link to="/cart">Edit cart</Link></div></div>}
      {quoteLoading && <p role="status"><span className="v1-commerce-loader" />Updating your total...</p>}
      {quote && <><div>{quote.items.map(item => <div className="v1-commerce-item" key={item.cart_item_id}>{item.image_url && <img src={item.image_url} alt={item.name} loading="lazy" />}<div><strong>{item.name}</strong><p>{item.size} · {item.colour} · Qty {item.qty}</p><p>{money(item.price * item.qty)}</p></div></div>)}</div><div className="v1-commerce-summary"><div className="v1-commerce-row"><span>Product MRP</span><span>{money(quote.mrp)}</span></div><div className="v1-commerce-row"><span>Product discount</span><span>−{money(quote.discount)}</span></div><div className="v1-commerce-row"><span>Products subtotal</span><span>{money(quote.subtotal)}</span></div><div className="v1-commerce-row"><span>Delivery charge</span><span>{quote.delivery_fee ? money(quote.delivery_fee) : 'FREE'}</span></div><div className="v1-commerce-row"><span>COD charge</span><span>{money(quote.cod_fee)}</span></div>{quote.reward_points > 0 && <div className="v1-commerce-row"><span>Rewards redeemed</span><span>−{money(quote.reward_points)}</span></div>}<div className="v1-commerce-row v1-commerce-total"><span>Total</span><span>{money(quote.payable)}</span></div></div></>}
      <p className="v1-commerce-note">Cancel within 7 days of placing your order, before dispatch. Eligible returns within 7 days of delivery. Innerwear cannot be returned. Delivery and COD charges are not refundable.</p>
      <button className="v1-commerce-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy || quoteLoading || !quote || !!quoteError || !!attempt || recoveryError} onClick={() => void submit()}>{busy ? 'Securing your order...' : method === 'COD' ? 'Place COD order' : 'Continue to payment'}</button>
      <p className="v1-commerce-muted">The amount shown above is calculated by V1Garments. Payment and order status are verified before confirmation.</p>
    </aside></div></div></main>;
}
