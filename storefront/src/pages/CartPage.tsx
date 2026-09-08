import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/utils';
import { useCart } from '../providers/cart-provider';
import { useLocale } from '../providers/locale-provider';

export function CartPage() {
  const { t } = useLocale();
  const { items, total, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="glass-strong mb-4 flex h-20 w-20 items-center justify-center rounded-3xl text-[var(--primary)]">
          <ShoppingBag size={36} />
        </div>
        <p className="font-bold">{t.emptyCart}</p>
        <Link to="/shop" className="btn-primary mt-6">{t.shop}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">{t.cart}</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productVariantId} className="glass-strong card-pop flex gap-3 rounded-2xl p-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-lg font-bold text-[var(--primary)]">
              {item.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="text-sm font-bold text-[var(--primary)]">{formatPrice(item.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => updateQty(item.productVariantId, item.quantity - 1)} className="glass flex h-7 w-7 items-center justify-center rounded-lg">
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold">{item.quantity}</span>
                <button type="button" onClick={() => updateQty(item.productVariantId, item.quantity + 1)} className="glass flex h-7 w-7 items-center justify-center rounded-lg">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <button type="button" onClick={() => removeItem(item.productVariantId)} className="self-start p-1 text-[#ea5455]">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <div className="flex justify-between text-sm">
          <span className="text-[#8a8da8]">{t.total}</span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </div>
        <Link to="/checkout" className="btn-primary mt-4 flex w-full justify-center">
          {t.checkout}
        </Link>
      </div>
    </div>
  );
}
