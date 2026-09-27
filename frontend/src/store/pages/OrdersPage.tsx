import { ChevronLeft, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../lib/api';
import { orderStatusLabel } from '../lib/order-status';
import { formatPrice } from '../lib/utils';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

type OrderRow = { id: number; order_number: string; status: string; total: number; placed_at?: string };

export function OrdersPage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn } = useCustomer();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    customerApi
      .orders(1)
      .then((page) => setOrders(page.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <Package size={40} className="mx-auto mb-3 text-[var(--primary)] opacity-40" />
        <p className="text-sm font-bold">{ar ? 'سجّل دخول لعرض الطلبات' : 'Login to view orders'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex text-sm">{ar ? 'حسابي' : 'Account'}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <h1 className="text-lg font-bold">{ar ? 'طلباتي' : 'My Orders'}</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-xl py-12 text-center text-xs text-[#8a8da8]">{ar ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="glass flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition active:scale-[0.99]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Package size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{o.order_number}</p>
                  <p className="text-[10px] text-[#8a8da8]">
                    {o.placed_at ? new Date(o.placed_at).toLocaleDateString(ar ? 'ar' : 'en') : '—'}
                    {' · '}
                    {orderStatusLabel(o.status, ar)}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-sm font-bold text-[var(--primary)]">{formatPrice(o.total)}</p>
                </div>
                <ChevronLeft size={16} className="shrink-0 text-[#8a8da8] ltr:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
