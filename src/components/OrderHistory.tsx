import { useEffect, useState } from 'react';
import { money, storeRequest } from '../services/storefrontApi';
export default function OrderHistory({ id }: { id: string }) {
  const [events,setEvents] = useState<any[]>([]), [refunds,setRefunds] = useState<any[]>([]), [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{
    const update=()=>setRefresh(n=>n+1);
    window.addEventListener('rewards-updated',update);
    window.addEventListener('focus',update);
    return ()=>{window.removeEventListener('rewards-updated',update);window.removeEventListener('focus',update);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    const load=async()=>{
      try {
        const [history,payments]=await Promise.all([storeRequest(`/storefront/orders/${id}/timeline`,{signal:controller.signal}),storeRequest(`/storefront/orders/${id}/refunds`,{signal:controller.signal})]);
        if (!controller.signal.aborted) {setEvents(history);setRefunds(payments);setError('');}
      } catch(e){if (!controller.signal.aborted) setError(e instanceof Error?e.message:'Order history could not refresh.');}
    };
    void load();
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},30000);
    return ()=>{controller.abort();window.clearInterval(timer);};
  },[id,refresh]);
  return <section className="v1-commerce-card"><h2>Order history & refunds</h2>
    {error&&<p role="alert" className="v1-commerce-alert">{error}</p>}
    {refunds.map(refund=><div key={refund.id} className="v1-commerce-note"><strong>{refund.kind==='RETURN'?'Return refund':'Cancellation refund'} · {money(refund.amount)}</strong><p>{refund.status.replace(/_/g,' ')}</p><p>{refund.message}</p>{refund.reference&&<p>Refund reference: {refund.reference}</p>}</div>)}
    <ol className="v1-order-timeline">{events.map(event=><li key={event.id}><strong>{event.event_type.replace(/_/g,' ')}{event.status?` · ${event.status.replace(/_/g,' ')}`:''}</strong><p>{new Date(event.occurred_at).toLocaleString('en-IN')}{event.details?.historical?' (original record)':''}</p>{event.details?.carrier_status&&<p>{event.details.carrier_status}</p>}{event.details?.payment_status&&<p>Payment: {event.details.payment_status}</p>}{event.details?.refund_status&&<p>Refund: {event.details.refund_status.replace(/_/g,' ')}</p>}</li>)}</ol>
    <button className="v1-commerce-secondary" onClick={()=>setRefresh(n=>n+1)}>Refresh order history</button>
  </section>;
}
