import { ArrowRight, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FavoriteButton } from '../components/product/FavoriteButton';
import { storeApi, unwrap } from '../lib/api';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { cn, formatPrice } from '../lib/utils';
import { useCart } from '../providers/cart-provider';
import { useLocale } from '../providers/locale-provider';

type SizeVariant = {
  id: number;
  name: string;
  price: number;
  in_stock: boolean;
  quantity: number;
  is_default?: boolean;
};

type ColorSibling = {
  id: number;
  name: string;
  color_name?: string | null;
  color_hex?: string | null;
  image?: string | null;
};

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
  color_name?: string | null;
  color_hex?: string | null;
  color_siblings?: ColorSibling[];
  size_variants?: SizeVariant[];
};

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    storeApi.product(Number(id))
      .then((r) => {
        const data = unwrap<ProductDetail>(r);
        setProduct(data);
        const sizes = data.size_variants ?? [];
        const defaultSize = sizes.find((s) => s.is_default) ?? sizes.find((s) => s.in_stock) ?? sizes[0];
        setSelectedVariantId(defaultSize?.id ?? data.variant_id ?? null);
        setQty(1);
      })
      .catch(() => navigate('/shop'));
  }, [id, navigate]);

  const activeVariant = useMemo(() => {
    if (!product?.size_variants?.length) return null;
    return product.size_variants.find((v) => v.id === selectedVariantId) ?? product.size_variants[0];
  }, [product, selectedVariantId]);

  const displayPrice = activeVariant?.price ?? product?.price ?? 0;
  const canAdd = activeVariant ? activeVariant.in_stock : (product?.in_stock ?? false);
  const variantIdForCart = activeVariant?.id ?? product?.variant_id;

  if (!product) {
    return <div className="glass aspect-square animate-pulse rounded-3xl" />;
  }

  const handleAdd = () => {
    if (!canAdd || !variantIdForCart) return;
    addItem({
      productId: product.id,
      productVariantId: variantIdForCart,
      name: activeVariant ? `${product.name} (${activeVariant.name})` : product.name,
      price: displayPrice,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const siblings = product.color_siblings ?? [];
  const showColors = siblings.length > 0 || product.color_hex || product.color_name;

  return (
    <div className="space-y-4 pb-4 page-slide-left">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="glass glass-interactive flex h-10 w-10 items-center justify-center rounded-xl">
          <ArrowRight size={20} className="rtl:rotate-180" />
        </button>
        <FavoriteButton
          product={{
            productId: product.id,
            productVariantId: variantIdForCart,
            name: product.name,
            price: displayPrice,
            compare_at_price: product.compare_at_price,
            in_stock: canAdd,
            category_name: product.category_name,
          }}
          size={20}
          className="h-10 w-10"
        />
      </div>

      <div className="glass-strong card-pop overflow-hidden rounded-3xl">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-soft)] to-transparent">
          <StoreMediaImage src={product.image} alt={product.name} className="p-6" />
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
            <span className="text-2xl font-bold text-[var(--primary)]">{formatPrice(displayPrice)}</span>
            {product.compare_at_price && product.compare_at_price > displayPrice ? (
              <span className="text-sm text-[#8a8da8] line-through">{formatPrice(product.compare_at_price)}</span>
            ) : null}
          </div>

          {showColors ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-store-muted">{t.chooseColor}</p>
              <div className="flex flex-wrap gap-2">
                <span
                  className="color-swatch ring-2 ring-[var(--primary)]"
                  style={{ background: product.color_hex || '#7367f0' }}
                  title={product.color_name || product.name}
                />
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    to={`/product/${s.id}`}
                    className={cn('color-swatch', s.id === product.id && 'ring-2 ring-[var(--primary)]')}
                    style={{ background: s.color_hex || '#c8cad8' }}
                    title={s.color_name || s.name}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {(product.size_variants ?? []).length > 1 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-store-muted">{t.chooseSize}</p>
              <div className="flex flex-wrap gap-2">
                {product.size_variants!.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.in_stock}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      selectedVariantId === v.id
                        ? 'bg-[var(--primary)] text-white'
                        : 'glass text-[var(--fg)]',
                      !v.in_stock && 'opacity-40',
                    )}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
        disabled={!canAdd}
        onClick={handleAdd}
      >
        <ShoppingCart size={20} />
        {added ? 'تمت الإضافة ✓' : canAdd ? t.addToCart : t.outOfStock}
      </button>

      {added ? (
        <Link to="/cart" className="block text-center text-sm font-semibold text-[var(--primary)]">
          عرض السلة
        </Link>
      ) : null}
    </div>
  );
}
