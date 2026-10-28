export function normalizeStoreApi(value?: string) {
  const configured = String(value || '').trim();
  return (configured || 'https://vandhana-shopping-mall-backend.vercel.app').replace(/\/+$/, '').replace(/(?:\/api)+$/i, '');
}
export const STORE_API = normalizeStoreApi(import.meta.env.VITE_API_BASE);
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
  if (!response.ok) throw new StoreError(response.status === 401 && data.code !== 'RAZORPAY_AUTH_FAILED' ? 'Your session has expired. Please sign in again.' : data.message || data.reason || 'The store could not complete this request. Please try again.', response.status, data);
  return data;
}
export const postStore = <T = any>(path: string, body: unknown) => storeRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const money = (value: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
export type Quote = {
  fingerprint: string; policy_version: number; payment_method: 'COD' | 'ONLINE';
  items: { cart_item_id: number; variant_id: number | null; name: string; size: string; colour: string; qty: number; price: number; mrp: number; offer_id?: string; offer_part?: string; image_url: string | null }[];
  offers?: { id: string; quantity: number; pairs: number; singles: number; subtotal: number; discount: number; ends_at: string }[];
  offer_discount?: number;
  max_reward_points: number; max_redemption_percent: number;
  cod_advance?: number; pay_now?: number; balance_on_delivery?: number;
  subtotal: number; mrp: number; discount: number; shipping: number; delivery_fee: number; cod_fee: number; reward_points: number; payable: number;
};
export type Checkout = { key: string; sale_id: string; payment_method: string; payment_status: string; fully_paid: boolean; payment_ready?: boolean; requires_payment?: boolean; advance_paid?: number; amount: number; quote: Quote };
export const checkoutPaymentReady = (checkout: Checkout) => checkout.payment_ready === true || checkout.payment_ready == null && (checkout.fully_paid || checkout.payment_method === 'COD' && !checkout.quote?.cod_advance);
export function notifyCommerceChanged() { window.dispatchEvent(new Event('cart-updated')); window.dispatchEvent(new Event('cartUpdated')); window.dispatchEvent(new Event('rewards-updated')); }
let razorpayScript: Promise<void> | null = null;
async function loadRazorpay() {
  if ((window as any).Razorpay) return;
  if (!razorpayScript) razorpayScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const failed = () => { window.clearTimeout(timer); razorpayScript = null; script.remove(); reject(new Error('Payment checkout could not be loaded. Your order is saved. Try again from your orders.')); };
    const timer = window.setTimeout(failed, 15000);
    script.onload = () => { if (!(window as any).Razorpay) return failed(); window.clearTimeout(timer); resolve(); };
    script.onerror = failed;
    document.head.appendChild(script);
  });
  await razorpayScript;
}
export async function payForCheckout(key: string, customer: { name?: string; email?: string; mobile?: string }) {
  const reconciled = await postStore<Checkout>(`/storefront/checkouts/${key}/reconcile`, {});
  if (checkoutPaymentReady(reconciled)) return reconciled;
  await loadRazorpay();
  const payment = await postStore<Checkout & { key_id: string; order_id: string; currency: string }>(`/storefront/checkouts/${key}/pay`, {});
  if (checkoutPaymentReady(payment)) return payment;
  const advance = payment.payment_method === 'COD' && Number(payment.quote?.cod_advance || 0) > 0;
  return new Promise<Checkout>((resolve, reject) => {
    let verifying = false;
    let failed = false;
    const gateway = new (window as any).Razorpay({
      key: payment.key_id, amount: payment.amount, currency: payment.currency, order_id: payment.order_id,
      name: 'V1 Garments', description: advance ? 'COD advance — platform, handling and COD charges' : 'Your clothing order', prefill: { name: customer.name, email: customer.email, contact: customer.mobile }, theme: { color: '#f7cf35' },
      ...(advance ? { config: { display: { blocks: { cod_upi: { name: 'Pay via PhonePe / UPI', instruments: [{ method: 'upi' }] } }, sequence: ['block.cod_upi'], preferences: { show_default_blocks: false } } } } : {}),
      handler: async (result: Record<string, string>) => {
        if (verifying || failed) return;
        verifying = true;
        try { const confirmed = await postStore<Checkout>(`/storefront/checkouts/${key}/verify`, result); if (!checkoutPaymentReady(confirmed)) throw new Error('Payment confirmation is pending. Check your saved order before paying again.'); notifyCommerceChanged(); resolve(confirmed); }
        catch (error) { reject(error); }
      },
      modal: { ondismiss: () => { if (!verifying && !failed) reject(new Error('Payment window closed. Your order is saved. You can resume payment from the order page.')); } },
    });
    gateway.on('payment.failed', (response: { error?: { description?: string } }) => {
      if (verifying || failed) return;
      failed = true;
      const detail = typeof response?.error?.description === 'string' ? response.error.description.slice(0, 240) : 'Payment was not completed.';
      gateway.close();
      reject(new Error(`${detail} Your order is saved. Check its payment status before trying again.`));
    });
    gateway.open();
  });
}
