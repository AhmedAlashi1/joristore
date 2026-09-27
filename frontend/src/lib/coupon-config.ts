export type CouponAppliesTo = 'subtotal' | 'shipping';
export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';

export function couponAppliesToLabel(applies: CouponAppliesTo, ar: boolean): string {
  if (applies === 'shipping') return ar ? 'رسوم الشحن' : 'Shipping fee';
  return ar ? 'مجموع المنتجات' : 'Order subtotal';
}

export function couponDiscountTypeLabel(type: CouponDiscountType, ar: boolean): string {
  if (type === 'percentage') return ar ? 'نسبة مئوية' : 'Percentage';
  if (type === 'fixed_amount') return ar ? 'مبلغ ثابت' : 'Fixed amount';
  return ar ? 'شحن مجاني (قديم)' : 'Free shipping (legacy)';
}

export function formatCouponValue(type: CouponDiscountType, value: number, ar: boolean): string {
  if (type === 'percentage') return `${value}%`;
  return ar ? `${value.toFixed(2)} ₪` : `${value.toFixed(2)}`;
}

export function formatCouponSummary(
  applies: CouponAppliesTo,
  type: CouponDiscountType,
  value: number,
  ar: boolean,
): string {
  const target = couponAppliesToLabel(applies, ar);
  const val = formatCouponValue(type, value, ar);
  if (type === 'percentage') {
    return ar ? `${val} على ${target}` : `${val} off ${target}`;
  }
  return ar ? `${val} خصم على ${target}` : `${val} off ${target}`;
}
