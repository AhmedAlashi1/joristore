export function orderStatusLabel(status: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    pending: ['قيد المراجعة', 'Pending'],
    confirmed: ['تم التأكيد', 'Confirmed'],
    processing: ['قيد التجهيز', 'Processing'],
    ready: ['جاهز للتسليم', 'Ready'],
    shipped: ['تم الشحن', 'Shipped'],
    returned: ['مرتجع', 'Returned'],
    completed: ['مكتمل', 'Completed'],
    canceled: ['ملغي', 'Canceled'],
    cancelled: ['ملغي', 'Canceled'],
    shipping_preparing: ['تجهيز الشحن', 'Preparing shipment'],
    shipping_shipped: ['تم الشحن', 'Shipped'],
    shipping_delivered: ['تم التسليم', 'Delivered'],
    shipping_returned: ['مرتجع', 'Returned'],
  };
  const row = map[status];
  if (row) return ar ? row[0] : row[1];
  return status;
}
