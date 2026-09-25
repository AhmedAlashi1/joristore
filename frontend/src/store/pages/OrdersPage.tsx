import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../lib/api';
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
    customerApi.orders()
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <Package size={48} className="mx-auto mb-4 text-[var(--primary)] opacity-40" />
        <p className="font-bold">{ar ? 'سجّل دخول لعرض الطلبات' : 'Login to view orders'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex">{ar ? 'حسابي' : 'Account'}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="reveal-up text-xl font-bold">{ar ? 'طلباتي' : 'My Orders'}</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
      ) : (
        orders.map((o, i) => (
          <div key={o.id} className={`glass-strong card-pop rounded-2xl p-4 stagger-${Math.min(i + 1, 4)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{o.order_number}</p>
                <p className="text-xs text-[#8a8da8]">{o.placed_at ? new Date(o.placed_at).toLocaleDateString() : '—'}</p>
              </div>
              <span className="rounded-lg bg-[var(--primary-soft)] px-2 py-1 text-xs font-bold text-[var(--primary)]">{o.status}</span>
            </div>
            <p className="mt-2 text-lg font-bold text-[var(--primary)]">{formatPrice(o.total)}</p>
          </div>
        ))
      )}
    </div>
  );
}
