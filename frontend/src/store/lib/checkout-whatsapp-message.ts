import type { CartItem } from '../providers/cart-provider';
import { cartLineSizeLabel } from './cart-line-size';
import { formatPrice } from './utils';

type CheckoutWhatsAppContext = {
  ar: boolean;
  customerName: string;
  customerPhone: string;
  fulfillment: 'delivery' | 'pickup';
  addressLine?: string;
  items: CartItem[];
  subtotal: number;
  shippingLabel: string;
  grandTotal: number;
  note?: string;
};

export function buildCheckoutWhatsAppMessage(ctx: CheckoutWhatsAppContext): string {
  const lines: string[] = [];
  if (ctx.ar) {
    lines.push('مرحباً، أريد تأكيد توفر المقاسات قبل إتمام الطلب:');
    lines.push('');
    lines.push(`الاسم: ${ctx.customerName}`);
    lines.push(`الجوال: ${ctx.customerPhone}`);
    lines.push(`الاستلام: ${ctx.fulfillment === 'delivery' ? 'توصيل' : 'استلام من المعرض'}`);
    if (ctx.addressLine) lines.push(`العنوان: ${ctx.addressLine}`);
  } else {
    lines.push('Hello, I need to confirm sizes are in stock before completing my order:');
    lines.push('');
    lines.push(`Name: ${ctx.customerName}`);
    lines.push(`Phone: ${ctx.customerPhone}`);
    lines.push(`Fulfillment: ${ctx.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}`);
    if (ctx.addressLine) lines.push(`Address: ${ctx.addressLine}`);
  }

  lines.push('');
  lines.push(ctx.ar ? 'المنتجات:' : 'Items:');
  ctx.items.forEach((item, i) => {
    const size = cartLineSizeLabel(item);
    const sizePart = size
      ? (ctx.ar ? ` — المقاس: ${size}` : ` — Size: ${size}`)
      : '';
    const idPart = ctx.ar ? ` — رقم المنتج: ${item.productId}` : ` — Product ID: ${item.productId}`;
    lines.push(
      `${i + 1}. ${item.name}${idPart}${sizePart} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`,
    );
  });

  lines.push('');
  lines.push(`${ctx.ar ? 'المجموع' : 'Subtotal'}: ${formatPrice(ctx.subtotal)}`);
  lines.push(`${ctx.ar ? 'الشحن' : 'Shipping'}: ${ctx.shippingLabel}`);
  lines.push(`${ctx.ar ? 'الإجمالي' : 'Total'}: ${formatPrice(ctx.grandTotal)}`);

  const note = ctx.note?.trim();
  if (note) {
    lines.push('');
    lines.push(ctx.ar ? `ملاحظات: ${note}` : `Notes: ${note}`);
  }

  lines.push('');
  lines.push(ctx.ar ? 'يرجى تأكيد توفر المقاسات. شكراً!' : 'Please confirm size availability. Thank you!');

  return lines.join('\n');
}
