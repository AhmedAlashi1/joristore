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
    shipping_not_required: ['استلام من المعرض', 'Showroom pickup'],
    not_required: ['لا يتطلب شحن', 'No shipping required'],
  };
  const row = map[status];
  if (row) return ar ? row[0] : row[1];
  if (status.startsWith('shipping_')) {
    const key = status.slice('shipping_'.length);
    const inner = map[`shipping_${key}`] ?? map[key];
    if (inner) return ar ? inner[0] : inner[1];
  }
  return status;
}
