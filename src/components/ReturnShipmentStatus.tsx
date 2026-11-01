type ReturnShipment = {
  status: string;
  awb?: string;
  courier_name?: string;
  cancelled_at?: string;
  reassigned_at?: string;
  pending_action?: string;
  pickup_requested_at?: string;
  updated_at?: string;
};
export default function ReturnShipmentStatus({shipment}:{shipment:ReturnShipment}) {
  const cancelled=!!shipment.cancelled_at || /^(RETURN[ _])?CANCELLED$|^(RETURN[ _])?CANCELED$/i.test(shipment.status);
  let message='The store is arranging your return pickup.';
  if(shipment.pending_action==='CANCEL')message='The store is confirming cancellation of the current pickup. Your return request remains active.';
  else if(shipment.pending_action==='REASSIGN')message='The store is changing your pickup courier. Wait for the confirmed courier and AWB before handing over your package.';
  else if(cancelled)message='The previous pickup was cancelled. The store will arrange a replacement pickup for your approved return.';
  else if(/^(RETURN[ _])?DELIVERED$|^(RETURN[ _])?REACHED WAREHOUSE$/i.test(shipment.status))message='The return reached the store. Refund processing follows receipt and inspection.';
  else if(/OUT[ _]FOR[ _]PICKUP/i.test(shipment.status))message='The courier is out for return pickup. Keep your package ready.';
  else if(/ERROR|EXCEPTION|FAILED|RESCHEDULED|NOT[ _]ATTEMPTED/i.test(shipment.status))message='The pickup needs another attempt. The store is reviewing the courier arrangement.';
  else if(shipment.pickup_requested_at)message='Return pickup has been requested. The courier will confirm collection.';
  return <div aria-label="Return pickup status">
    <p>{message}</p>
    {shipment.courier_name&&!cancelled&&!shipment.pending_action&&<p>Courier: <strong>{shipment.courier_name}</strong></p>}
    {shipment.awb&&!cancelled&&!shipment.pending_action&&<p>Return tracking number: {shipment.awb}</p>}
    {shipment.reassigned_at&&!cancelled&&<p>Courier updated {new Date(shipment.reassigned_at).toLocaleString('en-IN')}. Use the current tracking number for handover.</p>}
    {shipment.updated_at&&<p className="v1-commerce-muted">Last carrier check: {new Date(shipment.updated_at).toLocaleString('en-IN')}</p>}
  </div>;
}
