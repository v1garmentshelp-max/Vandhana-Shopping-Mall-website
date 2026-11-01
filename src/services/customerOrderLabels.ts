export function customerStatus(value?: string) {
  const status = String(value || '').toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const labels: Record<string, string> = {
    PLACED: 'Order received', CONFIRMED: 'Confirmed', PACKED: 'Preparing your delivery', PROCESSING: 'Preparing your delivery',
    PAID: 'Paid', COD: 'Cash on delivery', PENDING: 'Payment pending', 'PARTIALLY REFUNDED': 'Partly refunded', REFUNDED: 'Refund completed',
    CANCELLED: 'Cancelled', CANCELED: 'Cancelled', 'CANCELLATION REQUESTED': 'Cancellation requested', DELIVERED: 'Delivered',
    RTO: 'Returning to the store', RETURNED: 'Returned', SHIPPED: 'On its way', 'IN TRANSIT': 'On its way',
    REQUESTED: 'Awaiting store review', APPROVED: 'Approved', RECEIVED: 'Received', COMPLETED: 'Completed', REJECTED: 'Not approved',
    'PENDING REFUND': 'Refund pending', 'NOT DUE': 'No cash refund due', 'NOT REQUIRED': 'No cash refund due',
    PROCESSED: 'Refund processed', 'REVIEW REQUIRED': 'Store review in progress', FAILED: 'The store is checking this update',
    'OUT FOR DELIVERY': 'Out for delivery', 'OUT FOR PICKUP': 'Courier pickup in progress', 'PICKUP SCHEDULED': 'Pickup scheduled',
    'AWB ASSIGNED': 'Courier assigned', NEW: 'Preparing your order', CREATED: 'Preparing your order', UNDELIVERED: 'Delivery needs another attempt'
  };
  return labels[status] || 'Update in progress';
}
export function customerEvent(event: { event_type: string; status?: string; details?: { payment_status?: string; refund_status?: string } }) {
  const status = String(event.status || '').toUpperCase();
  const type = event.event_type;
  if (type === 'ORDER_PLACED') return 'Order received';
  if (type === 'ORDER_UPDATED') return event.details?.payment_status === 'PAID' && ['PLACED','CONFIRMED'].includes(status) ? 'Payment confirmed' : customerStatus(status);
  if (type === 'SHIPMENT_UPDATED') return customerStatus(status);
  if (type === 'CANCELLATION_UPDATED') return ({ REQUESTED: 'Cancellation requested', REVIEW_REQUIRED: 'Cancellation being checked', COMPLETED: 'Cancellation confirmed', REJECTED: 'Cancellation not approved' } as Record<string,string>)[status] || 'Cancellation updated';
  if (type === 'RETURN_UPDATED') return `Return: ${customerStatus(status)}`;
  if (type === 'REFUND_UPDATED') return status === 'PENDING' ? 'Refund being processed' : customerStatus(status);
  return null;
}
