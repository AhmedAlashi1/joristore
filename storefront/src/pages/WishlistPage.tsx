import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from '../components/product/FavoriteButton';
import { useCart } from '../providers/cart-provider';
import { useLocale } from '../providers/locale-provider';
import { useWishlist } from '../providers/wishlist-provider';
import { formatPrice } from '../lib/utils';

export function WishlistPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { items, remove, clear } = useWishlist();
  const { addItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <Heart size={48} className="mx-auto mb-4 text-[var(--primary)] opacity-40" />
        <p className="font-bold">{t.emptyWishlist}</p>
        <p className="mt-1 text-sm text-[#8a8da8]">{t.emptyWishlistHint}</p>
        <Link to="/shop" className="btn-primary mt-4 inline-flex">{t.shop}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.wishlist}</h1>
        <button type="button" onClick={clear} className="text-xs font-semibold text-[#ea5455]">
          {t.clearWishlist}
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
            <div key={item.productId} className="glass-strong flex gap-3 rounded-2xl p-3">
              <Link to={`/product/${item.productId}`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-2xl font-black text-[var(--primary)] opacity-40">
                {item.name.charAt(0)}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${item.productId}`} className="line-clamp-2 text-sm font-bold">{item.name}</Link>
                {item.category_name ? <p className="text-[10px] text-[#8a8da8]">{item.category_name}</p> : null}
                <p className="mt-1 text-base font-bold text-[var(--primary)]">{formatPrice(item.price)}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!item.productVariantId || item.in_stock === false}
                    onClick={() => item.productVariantId && addItem({
                      productId: item.productId,
                      productVariantId: item.productVariantId,
                      name: item.name,
                      price: item.price,
                    })}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    <ShoppingCart size={14} />
                    {t.addToCart}
                  </button>
                  <FavoriteButton product={item} />
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="glass flex h-9 w-9 items-center justify-center rounded-xl text-[#ea5455]"
                    aria-label={ar ? 'حذف' : 'Remove'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
