import { ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { formatPrice } from '../lib/format-price';
import { mediaUrl } from '../lib/media';
import { useI18n } from '../providers/i18n-provider';

type CartItem = {
  productId: number;
  productVariantId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
};

type CartPayload = {
  customer_name: string;
  items: CartItem[];
  item_count: number;
  total: number;
  synced_at?: string | null;
};

export function CustomerCartPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [data, setData] = useState<CartPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/customers/${id}/cart`);
      setData(ensureApiSuccess<CartPayload>(res, ''));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/customers" className="glass rounded-xl p-2">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'سلة العميل' : 'Customer cart'}</h2>
          {data ? <p className="text-sm text-[#8a8da8]">{data.customer_name}</p> : null}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#7367f0]" /></div>
      ) : !data || data.items.length === 0 ? (
        <div className="glass-strong rounded-2xl py-16 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-[#8a8da8]" />
          <p className="text-sm text-[#8a8da8]">{ar ? 'السلة فارغة أو لم تُزامَن بعد' : 'Cart is empty or not synced yet'}</p>
        </div>
      ) : (
        <>
          <ul className="glass-strong divide-y divide-[#ebe9f1] overflow-hidden rounded-2xl">
            {data.items.map((item) => (
              <li key={item.productVariantId} className="flex gap-3 px-4 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f8f7fa]">
                  {item.image ? (
                    <img src={mediaUrl(item.image)} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-[#8a8da8]">{item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="shrink-0 font-bold">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-sm text-[#8a8da8]">{ar ? 'الإجمالي' : 'Total'} ({data.item_count})</span>
            <span className="text-xl font-bold">{formatPrice(data.total)}</span>
          </div>
          {data.synced_at ? (
            <p className="text-center text-xs text-[#8a8da8]">
              {ar ? 'آخر مزامنة:' : 'Last sync:'}{' '}
              {new Date(data.synced_at).toLocaleString(ar ? 'ar' : 'en')}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
