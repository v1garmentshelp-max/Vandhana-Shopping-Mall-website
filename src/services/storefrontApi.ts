export const STORE_API = (import.meta.env.VITE_API_BASE || 'https://vandhana-shopping-mall-backend.vercel.app').replace(/\/+$/, '');
export const customerToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
export function customerFetch(input: RequestInfo | URL, options: RequestInit = {}) {
  const headers=new Headers(options.headers);
  headers.set('Authorization',`Bearer ${customerToken()}`);
  return fetch(input,{...options,headers});
}
export class StoreError extends Error {
  status: number;
  code?: string;
  checkoutNotCreated: boolean;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message); this.status = status; this.code = typeof data.code === 'string' ? data.code : undefined; this.checkoutNotCreated = data.checkout_not_created === true;
  }
}
export async function storeRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(`${STORE_API}/api${path}`, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken()}`, ...options.headers } }); }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; throw new StoreError('We could not reach the store. Check your connection and try again.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StoreError(response.status === 401 ? 'Your session has expired. Please sign in again.' : data.message || data.reason || 'The store could not complete this request. Please try again.', response.status, data);
  return data;
}
export const postStore = <T = any>(path: string, body: unknown) => storeRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const money = (value: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
export type Quote = {
  fingerprint: string; policy_version: number; payment_method: 'COD' | 'ONLINE';
  items: { cart_item_id: number; variant_id: number | null; name: string; size: string; colour: string; qty: number; price: number; mrp: number; image_url: string | null }[];
  subtotal: number; mrp: number; discount: number; shipping: number; delivery_fee: number; cod_fee: number; reward_points: number; payable: number;
};
export type Checkout = { key: string; sale_id: string; payment_method: string; payment_status: string; fully_paid: boolean; amount: number; quote: Quote };
export function notifyCommerceChanged() { window.dispatchEvent(new Event('cart-updated')); window.dispatchEvent(new Event('cartUpdated')); window.dispatchEvent(new Event('rewards-updated')); }
let razorpayScript: Promise<void> | null = null;
async function loadRazorpay() {
  if ((window as any).Razorpay) return;
  if (!razorpayScript) razorpayScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => (window as any).Razorpay ? resolve() : reject(new Error('Payment checkout could not be loaded. Your order is saved.'));
    script.onerror = () => { razorpayScript = null; script.remove(); reject(new Error('Payment checkout could not be loaded. Your order is saved. Try again from your orders.')); };
    document.head.appendChild(script);
  });
  await razorpayScript;
}
export async function payForCheckout(key: string, customer: { name?: string; email?: string; mobile?: string }) {
  const reconciled = await postStore<Checkout>(`/storefront/checkouts/${key}/reconcile`, {});
  if (reconciled.fully_paid) return reconciled;
  await loadRazorpay();
  const payment = await postStore<Checkout & { key_id: string; order_id: string; currency: string }>(`/storefront/checkouts/${key}/pay`, {});
  if (payment.fully_paid) return payment;
  return new Promise<Checkout>((resolve, reject) => {
    let verifying = false;
    const gateway = new (window as any).Razorpay({
      key: payment.key_id, amount: payment.amount, currency: payment.currency, order_id: payment.order_id,
      name: 'V1Garments', description: 'Your clothing order', prefill: { name: customer.name, email: customer.email, contact: customer.mobile }, theme: { color: '#f7cf35' },
      handler: async (result: Record<string, string>) => {
        verifying = true;
        try { const confirmed = await postStore<Checkout>(`/storefront/checkouts/${key}/verify`, result); if (!confirmed.fully_paid) throw new Error('Payment confirmation is pending. Check your saved order before paying again.'); notifyCommerceChanged(); resolve(confirmed); }
        catch (error) { reject(error); }
      },
      modal: { ondismiss: () => { if (!verifying) reject(new Error('Payment window closed. Your order is saved. You can resume payment from the order page.')); } },
    });
    gateway.open();
  });
}
