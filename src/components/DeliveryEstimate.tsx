import { useEffect, useState } from 'react';
import { storeRequest } from '../services/storefrontApi';
import '../styles/address.css';

type Estimate = { status: 'available' | 'not_serviceable' | 'unavailable'; serviceable: boolean | null; message: string; source?: string };
export default function DeliveryEstimate({ pincode, method, cartKey, onBlocked }: { pincode: string; method: 'COD' | 'ONLINE'; cartKey: string; onBlocked: (blocked: boolean) => void }) {
  const [result, setResult] = useState<Estimate | null>(null), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    setResult(null); onBlocked(false);
    if (!/^[1-9]\d{5}$/.test(pincode) || !cartKey) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); onBlocked(true);
    const timer = window.setTimeout(() => {
      storeRequest<Estimate>('/storefront/delivery/estimate', { method: 'POST', body: JSON.stringify({ pincode, payment_method: method }), signal: controller.signal }).then(data => {
        if (!controller.signal.aborted) { setResult(data); onBlocked(data.serviceable === false); }
      }).catch(() => { if (!controller.signal.aborted) { setResult({ status: 'unavailable', serviceable: null, message: 'Delivery availability and timing cannot be confirmed right now. The store will confirm after reviewing your order.' }); onBlocked(false); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [pincode, method, cartKey, retry, onBlocked]);
  return <div className="v1-delivery-estimate" data-status={result?.status} aria-live="polite" aria-busy={loading}>
    <strong>Delivery availability &amp; timing</strong>
    {!/^[1-9]\d{5}$/.test(pincode) ? <p>Enter your PIN code to check delivery.</p> : loading ? <p>Checking courier availability…</p> : result ? <><p>{result.message}</p>{result.source && <small>Carrier estimate via {result.source}. This is an estimate, not a guaranteed delivery date.</small>}{result.serviceable === null && <p><button type="button" onClick={() => setRetry(count => count + 1)}>Retry delivery check</button></p>}</> : <p>Your estimate appears when your cart is ready.</p>}
  </div>;
}
