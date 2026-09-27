export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'ready',
  'shipped',
  'completed',
  'canceled',
  'returned',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function orderStatusLabel(status: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    pending: ['قيد المراجعة', 'Pending'],
    confirmed: ['تم التأكيد', 'Confirmed'],
    processing: ['قيد التجهيز', 'Processing'],
    ready: ['جاهز للتسليم', 'Ready'],
    shipped: ['تم الشحن', 'Shipped'],
    completed: ['مكتمل', 'Completed'],
    canceled: ['ملغي', 'Canceled'],
    cancelled: ['ملغي', 'Canceled'],
    returned: ['مرتجع', 'Returned'],
  };
  const row = map[status];
  if (row) return ar ? row[0] : row[1];
  return status;
}

export function paymentStatusLabel(status: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    pending: ['بانتظار الدفع', 'Pending'],
    paid: ['مدفوع', 'Paid'],
    partially_paid: ['مدفوع جزئياً', 'Partially paid'],
    failed: ['فشل', 'Failed'],
    refunded: ['مسترد', 'Refunded'],
  };
  const row = map[status];
  if (row) return ar ? row[0] : row[1];
  return status;
}

export function paymentMethodLabel(method: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    cash_on_delivery: ['الدفع عند الاستلام', 'Cash on delivery'],
    wallet: ['المحفظة', 'Wallet'],
    jawwal_pay: ['جوال بي', 'Jawwal Pay'],
    pal_pay: ['بال بي', 'PalPay'],
    bank_transfer: ['تحويل بنكي', 'Bank transfer'],
    card: ['بطاقة', 'Card'],
  };
  const row = map[method];
  if (row) return ar ? row[0] : row[1];
  return method;
}

export const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  ready: 'default',
  shipped: 'success',
  completed: 'success',
  canceled: 'destructive',
  returned: 'destructive',
};

/** Common quick transitions from current status */
export function quickStatusActions(current: string): string[] {
  const flow: Record<string, string[]> = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['processing', 'canceled'],
    processing: ['ready', 'canceled'],
    ready: ['shipped'],
    shipped: ['completed', 'returned'],
    completed: ['returned'],
    canceled: [],
    returned: [],
  };
  return flow[current] ?? [];
}
