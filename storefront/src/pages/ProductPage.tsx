import { ArrowRight, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FavoriteButton } from '../components/product/FavoriteButton';
import { storeApi, unwrap } from '../lib/api';
import { formatPrice, resolveMediaUrl } from '../lib/utils';
import { useCart } from '../providers/cart-provider';
import { useLocale } from '../providers/locale-provider';

type ProductDetail = {
  id: number;
  name: string;
  short_description?: string;
  description?: string;
  price: number;
  variant_id?: number;
  compare_at_price?: number;
  in_stock: boolean;
  quantity: number;
  category_name?: string;
  brand_name?: string;
  image?: string | null;
};

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    storeApi.product(Number(id))
      .then((r) => setProduct(unwrap<ProductDetail>(r)))
      .catch(() => navigate('/shop'));
  }, [id, navigate]);

  if (!product) {
    return <div className="glass aspect-square animate-pulse rounded-3xl" />;
  }

  const handleAdd = () => {
    if (!product.in_stock || !product.variant_id) return;
    addItem({
      productId: product.id,
      productVariantId: product.variant_id,
      name: product.name,
      price: product.price,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-4 pb-4 page-slide-left">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="glass glass-interactive flex h-10 w-10 items-center justify-center rounded-xl">
          <ArrowRight size={20} className="rtl:rotate-180" />
        </button>
        <FavoriteButton
          product={{
            productId: product.id,
            productVariantId: product.variant_id,
            name: product.name,
            price: product.price,
            compare_at_price: product.compare_at_price,
            in_stock: product.in_stock,
            category_name: product.category_name,
          }}
          size={20}
          className="h-10 w-10"
        />
      </div>

      <div className="glass-strong card-pop overflow-hidden rounded-3xl">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-soft)] to-transparent">
          {product.image ? (
            <img src={resolveMediaUrl(product.image)} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="float-soft text-8xl font-black text-[var(--primary)] opacity-20">{product.name.charAt(0)}</span>
          )}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
        </div>
        <div className="p-5">
          {product.category_name ? (
            <p className="text-xs font-semibold text-[var(--primary)]">{product.category_name}</p>
          ) : null}
          <h1 className="mt-1 text-xl font-bold">{product.name}</h1>
          {product.short_description ? (
            <p className="mt-2 text-sm text-[#6f6b7d]">{product.short_description}</p>
          ) : null}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--primary)]">{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <span className="text-sm text-[#8a8da8] line-through">{formatPrice(product.compare_at_price)}</span>
            ) : null}
          </div>
          {product.description ? (
            <p className="mt-4 text-sm leading-relaxed text-[#6f6b7d]">{product.description}</p>
          ) : null}
        </div>
      </div>

      <div className="glass-strong flex items-center justify-between rounded-2xl p-4">
        <span className="text-sm font-semibold">الكمية</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="glass flex h-9 w-9 items-center justify-center rounded-xl">
            <Minus size={16} />
          </button>
          <span className="min-w-[2rem] text-center font-bold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => q + 1)} className="glass flex h-9 w-9 items-center justify-center rounded-xl">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary w-full"
        disabled={!product.in_stock}
        onClick={handleAdd}
      >
        <ShoppingCart size={20} />
        {added ? 'تمت الإضافة ✓' : product.in_stock ? t.addToCart : t.outOfStock}
      </button>

      {added ? (
        <Link to="/cart" className="block text-center text-sm font-semibold text-[var(--primary)]">
          عرض السلة
        </Link>
      ) : null}
    </div>
  );
}
