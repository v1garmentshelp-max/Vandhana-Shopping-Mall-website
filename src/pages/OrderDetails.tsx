import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { money, notifyCommerceChanged, payForCheckout, postStore, storeRequest } from '../services/storefrontApi';
import '../styles/commerce.css';
import OrderHistory from '../components/OrderHistory';
const date = (value: string) => new Date(value).toLocaleString('en-IN');
export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<any>(null), [cancellation, setCancellation] = useState<any>(null), [returns, setReturns] = useState<any[]>([]), [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(location.state?.message || '');
  const [cancelReason, setCancelReason] = useState(''), [returnReason, setReturnReason] = useState(''), [upi, setUpi] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({}), [tracking, setTracking] = useState<any>(null);
  const working = useRef(false);
  const load = useCallback(async () => {
    try {
      const [sale, cancel, eligible, requests] = await Promise.all([
        storeRequest(`/storefront/orders/${id}`), storeRequest(`/storefront/orders/${id}/cancellation`),
        storeRequest(`/storefront/orders/${id}/return-eligibility`), storeRequest(`/storefront/orders/${id}/returns`),
      ]);
      setOrder(sale); setCancellation(cancel); setEligibility(eligible); setReturns(requests); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Your order could not be loaded.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && !working.current) void load(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const timer=window.setInterval(refresh,30000);
    return () => { window.clearInterval(timer);window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  const action = async (task: () => Promise<void>) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try { await task(); notifyCommerceChanged(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'This request could not be completed.'); }
    finally { working.current = false; setBusy(false); }
  };
  if (loading) return <main className="v1-commerce"><div className="v1-commerce-wrap" role="status"><span className="v1-commerce-loader" />Loading your order...</div></main>;
  if (!order) return <main className="v1-commerce"><div className="v1-commerce-card v1-commerce-wrap"><h1>Order details</h1><p className="v1-commerce-alert" role="alert">{error || 'Order not found.'}</p><div className="v1-commerce-actions"><button onClick={() => void load()} className="v1-commerce-secondary">Try again</button><Link to="/profile?tab=orders">My orders</Link><Link to="/auth">Sign in</Link></div></div></main>;
  const totals = order.totals || {};
  const paid = order.payment_status === 'PAID';
  const closed = /CANCEL|RETURN|RTO|DELIVER/.test(order.status);
  const cancellationPending = cancellation?.request && cancellation.request.status !== 'REJECTED';
  return <main className="v1-commerce"><div className="v1-commerce-wrap">
    <Link to="/profile?tab=orders">← My orders</Link><h1>{params.has('placed') && !closed ? paid || order.payment_method === 'COD' ? 'Your order is confirmed.' : 'Your order is saved.' : 'Your order, at a glance.'}</h1>
    <p className="v1-commerce-muted" style={{ overflowWrap: 'anywhere' }}>Order {order.id} · {date(order.created_at)}</p>
    {message && <p role="status" className="v1-commerce-note">{message}</p>}{error && <div role="alert" className="v1-commerce-alert">{error}<button className="v1-commerce-secondary" onClick={() => void load()}>Refresh</button></div>}
    <div className="v1-commerce-grid"><div className="v1-commerce-stack">
      <section className="v1-commerce-card"><h2>Items in your order</h2><span className="v1-commerce-badge">{cancellationPending && cancellation.request.status !== 'COMPLETED' ? 'CANCELLATION REQUESTED' : order.status}</span>{order.items.map((item: any) => <div className="v1-commerce-item" key={item.id}>{item.image_url && <img src={item.image_url} alt={item.product_name || 'Clothing'} loading="lazy" />}<div><h3>{item.product_name || 'Clothing'}</h3><p>{item.size} · {item.colour} · Qty {item.qty}</p><strong>{money(Number(item.price) * Number(item.qty))}</strong></div></div>)}</section>
      <section className="v1-commerce-card"><h2>Delivery updates</h2><p>{order.status === 'DELIVERED' ? 'Your order has been delivered.' : closed ? 'This order is no longer in the active delivery flow.' : order.payment_method === 'ONLINE' && !paid ? 'Dispatch begins after payment is confirmed.' : 'The store is preparing your delivery.'}</p>{order.shipments?.map((s: any, i: number) => <p key={i}>{s.status}{s.awb ? ` · AWB ${s.awb}` : ''}</p>)}
        {order.shipments?.length > 0 && !closed && <button disabled={busy} className="v1-commerce-secondary" onClick={() => void action(async () => { const data = await storeRequest(`/storefront/orders/${id}/tracking`); setTracking(data); })}>Refresh carrier tracking</button>}
        {tracking && <><p><strong>{tracking.status}</strong></p><ol>{(tracking.events || []).map((event: any, i: number) => <li key={i}>{event.activity || event.status} {event.location ? `at ${event.location}` : ''} {event.date || event.timestamp ? ` · ${date(event.date || event.timestamp)}` : ''}</li>)}</ol></>}
      </section>
      <section className="v1-commerce-card"><h2>Cancellation</h2>{cancellation?.request ? <><p className="v1-commerce-note">{cancellation.request.message}</p><p>Requested {date(cancellation.request.created_at)}</p><p>Reward points restored after confirmation: {cancellation.request.reward_points || 0}</p>{cancellation.request.refund_reference && <p>Refund reference: {cancellation.request.refund_reference}</p>}<p>Refund status: {cancellation.request.refund_status.replace(/_/g, ' ')}</p><p>Product refund: <strong>{money(cancellation.request.refund_amount)}</strong></p><p>Delivery and COD excluded: {money(cancellation.request.excluded_fees)}</p></> : cancellation?.eligible ? <details><summary>Cancel order</summary><p>You can request cancellation before dispatch until {date(cancellation.deadline)}.</p><p className="v1-commerce-note">{cancellation.refund?.note} {cancellation.refund?.product_amount != null ? `Estimated product refund: ${money(cancellation.refund.product_amount)}.` : ''}</p><label>Why are you cancelling?<textarea maxLength={1000} rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></label><button className="v1-commerce-secondary v1-commerce-danger" style={{ marginTop: 16 }} disabled={busy || cancelReason.trim().length < 5} onClick={() => void action(async () => { const result = await postStore(`/storefront/orders/${id}/cancel`, { reason: cancelReason }); setMessage(result.message); })}>{busy ? 'Submitting...' : 'Confirm cancellation request'}</button></details> : <p>{cancellation?.reason || 'Cancellation is unavailable.'}</p>}</section>
      <OrderHistory id={order.id}/>
      <section className="v1-commerce-card"><h2>Returns</h2><p className="v1-commerce-muted">Eligible items can be returned within 7 days of confirmed delivery. Innerwear is excluded. Delivery and COD charges are not refundable.</p>
        {eligibility?.ok ? <details><summary>Request a return</summary><p>Return deadline: {date(eligibility.deadline)}</p>{eligibility.items.map((item: any) => <div className="v1-commerce-item" key={item.sale_item_id}><div style={{ flex: 1 }}><strong>{item.product_name}</strong><p>{item.size} · {item.colour}</p>{item.eligible ? <label>Quantity to return<select value={quantities[item.sale_item_id] || 0} onChange={e => setQuantities(prev => ({ ...prev, [item.sale_item_id]: Number(e.target.value) }))}>{Array.from({ length: item.remaining_qty + 1 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Do not return' : i}</option>)}</select></label> : <p>{item.reason}</p>}</div></div>)}<label>Return reason<textarea rows={3} maxLength={1500} value={returnReason} onChange={e => setReturnReason(e.target.value)} /></label>{order.payment_method === 'COD' && <label style={{ marginTop: 16 }}>UPI ID for an approved refund (optional)<input value={upi} maxLength={150} onChange={e => setUpi(e.target.value)} /></label>}<button className="v1-commerce-primary" style={{ marginTop: 16 }} disabled={busy || returnReason.trim().length < 10 || !Object.values(quantities).some(Boolean)} onClick={() => void action(async () => { const result = await postStore(`/storefront/orders/${id}/return`, { reason: returnReason, type: 'RETURN', bank_upi: upi, items: Object.entries(quantities).filter(([, qty]) => qty > 0).map(([sale_item_id, qty]) => ({ sale_item_id, qty })) }); setMessage(`Return request received. Product-only refund after approval and item inspection: ${money(result.request.refund.amount)}. Delivery and COD charges are excluded.`); setQuantities({}); setReturnReason(''); })}>Submit return request</button></details> : <p>{eligibility?.reason || 'No return is currently available.'}</p>}
        {returns.map(request => <div key={request.id} className="v1-commerce-note" style={{ marginTop: 16 }}><strong>Return #{request.id} · {request.status}</strong><p>{request.reason}</p>{request.refund_amount_paise != null && <p>Product refund: {money(Number(request.refund_amount_paise) / 100)} · Rewards to restore: {request.refund_points || 0}</p>}<p>{request.refund_status ? request.refund_status.replace(/_/g, ' ') : 'Awaiting store review'}</p>{request.items_received_at && <p>Returned items received: {date(request.items_received_at)}</p>}{request.reverse_shipment && <p>Return courier: {request.reverse_shipment.status}{request.reverse_shipment.awb ? ` · AWB ${request.reverse_shipment.awb}` : ''}</p>}{request.refund_reference && <p>Refund reference: {request.refund_reference}</p>}</div>)}
      </section>
    </div><aside className="v1-commerce-stack"><section className="v1-commerce-card"><h2>Payment summary</h2><p>{order.payment_method === 'COD' ? 'Cash on delivery' : 'Online payment'} · {order.payment_status}</p><div className="v1-commerce-summary"><div className="v1-commerce-row"><span>Products</span><span>{money(totals.subtotal ?? order.items.reduce((n: number, i: any) => n + Number(i.price) * Number(i.qty), 0))}</span></div><div className="v1-commerce-row"><span>Delivery</span><span>{money(totals.delivery_fee ?? totals.shipping ?? totals.convenience)}</span></div>{totals.cod_fee != null && <div className="v1-commerce-row"><span>COD charge</span><span>{money(totals.cod_fee)}</span></div>}<div className="v1-commerce-row"><span>Rewards redeemed</span><span>−{money(totals.reward_points ?? totals.rewardPoints)}</span></div><div className="v1-commerce-row v1-commerce-total"><span>{paid ? 'Paid' : 'Order total'}</span><span>{money(order.total)}</span></div></div>
      {order.checkout_key && order.payment_method === 'ONLINE' && !paid && !closed && !cancellationPending && <div className="v1-commerce-stack"><button className="v1-commerce-primary" disabled={busy} onClick={() => void action(async () => { await payForCheckout(order.checkout_key, { name: order.customer_name, email: order.customer_email, mobile: order.customer_mobile }); setMessage('Payment confirmed. Your order is ready for processing.'); })}>{busy ? 'Checking payment...' : 'Resume secure payment'}</button><button className="v1-commerce-secondary" disabled={busy} onClick={() => void action(async () => { const checked = await postStore(`/storefront/checkouts/${order.checkout_key}/reconcile`, {}); setMessage(checked.fully_paid ? 'Your payment is confirmed.' : 'No captured payment is confirmed yet. If your bank was debited, check again before retrying.'); })}>Already paid? Check payment</button></div>}
      </section><section className="v1-commerce-card"><h2>Delivery address</h2><strong>{order.customer_name}</strong><p>{order.shipping_address?.line1 || order.shipping_address?.address_line1}<br />{order.shipping_address?.line2 || order.shipping_address?.address_line2}<br />{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.pincode}</p><p>{order.customer_mobile}</p></section></aside></div>
  </div></main>;
}
