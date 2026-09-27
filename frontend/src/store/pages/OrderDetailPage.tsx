import { ArrowRight, Package, Route } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckoutSection } from '../components/checkout/CheckoutSection';
import { customerApi } from '../lib/api';
import { orderStatusLabel } from '../lib/order-status';
import { formatPrice } from '../lib/utils';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

type OrderDetail = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  subtotal: number;
  shipping: number;
  total: number;
  placed_at?: string;
  items: Array<{
    id: number;
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  tracking_steps: Array<{ status: string; note?: string | null; at?: string }>;
};

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn } = useCustomer();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !id) {
      setLoading(false);
      return;
    }
    customerApi
      .order(Number(id))
      .then(setOrder)
      .catch(() => navigate('/orders'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <Link to="/account" className="btn-primary inline-flex">{ar ? 'حسابي' : 'Account'}</Link>
      </div>
    );
  }

  if (loading || !order) {
    return <div className="skeleton-shimmer h-40 rounded-2xl" />;
  }

  const placed = order.placed_at ? new Date(order.placed_at).toLocaleString(ar ? 'ar' : 'en') : '—';

  return (
    <div className="checkout-flow space-y-3 pb-6 page-slide-left">
      <div className="flex items-center gap-2 px-0.5">
        <button type="button" onClick={() => navigate(-1)} className="glass flex h-9 w-9 items-center justify-center rounded-xl">
          <ArrowRight size={18} className="rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{order.order_number}</h1>
          <p className="text-[10px] text-store-muted">{placed}</p>
        </div>
        <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--primary)]">
          {orderStatusLabel(order.status, ar)}
        </span>
      </div>

      <CheckoutSection icon={<Route size={20} />} title={ar ? 'تتبع الطلب' : 'Order tracking'}>
        <ol className="space-y-0 border-s-2 border-[var(--primary-soft)] ps-3">
          {order.tracking_steps.length === 0 ? (
            <li className="relative pb-2 text-xs text-store-muted">
              {ar ? 'تم استلام الطلب' : 'Order received'}
            </li>
          ) : (
            order.tracking_steps.map((step, i) => (
              <li key={`${step.status}-${i}`} className="relative pb-3 last:pb-0">
                <span className="absolute -start-[1.05rem] top-1 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-2 ring-white" />
                <p className="text-xs font-bold">{orderStatusLabel(step.status, ar)}</p>
                {step.at ? (
                  <p className="text-[10px] text-store-muted">{new Date(step.at).toLocaleString(ar ? 'ar' : 'en')}</p>
                ) : null}
              </li>
            ))
          )}
        </ol>
      </CheckoutSection>

      <CheckoutSection icon={<Package size={20} />} title={ar ? 'ملخص الطلب' : 'Order summary'}>
        <ul className="divide-y divide-black/[0.05]">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">
                  {item.quantity}× {item.product_name}
                </p>
                {item.variant_name && item.variant_name !== 'Default' ? (
                  <p className="mt-0.5 text-xs text-store-muted">
                    {ar ? 'المقاس:' : 'Size:'} {item.variant_name}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[10px] text-store-muted">
                  {formatPrice(item.unit_price)} {ar ? 'للقطعة' : 'each'}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-[var(--primary)]">{formatPrice(item.total)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-dashed border-black/10 pt-3 text-sm">
          <span className="text-store-muted">{ar ? 'إجمالي المنتجات' : 'Items total'}</span>
          <span className="font-bold">{formatPrice(order.subtotal)}</span>
        </div>
      </CheckoutSection>

      <section className="glass-strong rounded-2xl p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-store-muted">{ar ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span className="font-semibold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-store-muted">{ar ? 'الشحن' : 'Shipping'}</span>
            <span className="font-semibold">{formatPrice(order.shipping)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-black/10 pt-3">
          <span className="text-sm font-bold">{ar ? 'الإجمالي' : 'Total'}</span>
          <span className="text-xl font-black text-[var(--primary)]">{formatPrice(order.total)}</span>
        </div>
      </section>
    </div>
  );
}
