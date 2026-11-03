import { ArrowRight, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductColorSwatches, type ColorVariant } from '../components/product/ProductColorSwatches';
import { FavoriteButton } from '../components/product/FavoriteButton';
import { storeApi, unwrap } from '../lib/api';
import { ProductImageGallery } from '../components/product/ProductImageGallery';
import { cn, formatPrice } from '../lib/utils';
import { useAddToCartMotion } from '../lib/use-add-to-cart-motion';
import { pickLocalizedText } from '../lib/localized-text';
import { normalizeProductImagePath } from '../lib/product-image';
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
  images?: string[];
  name_en?: string | null;
  short_description_en?: string | null;
  description_en?: string | null;
  category_name_en?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  color_siblings?: ColorSibling[];
  size_variants?: SizeVariant[];
};

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const addToCart = useAddToCartMotion();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [variantSlideDir, setVariantSlideDir] = useState(0);
  const [colorSwitching, setColorSwitching] = useState(false);

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
  const stockMax = activeVariant ? activeVariant.quantity : (product?.quantity ?? 0);
  const canAdd = activeVariant ? activeVariant.in_stock && stockMax > 0 : (product?.in_stock ?? false) && stockMax > 0;
  const variantIdForCart = activeVariant?.id ?? product?.variant_id;

  useEffect(() => {
    if (!product) return;
    setQty((q) => {
      const cap = stockMax > 0 ? stockMax : 1;
      return Math.min(Math.max(1, q), cap);
    });
  }, [selectedVariantId, stockMax, product]);

  const colorVariants = useMemo((): ColorVariant[] => {
    if (!product) return [];
    const siblings = product.color_siblings ?? [];
    const self: ColorVariant = {
      id: product.id,
      name: product.name,
      color_hex: product.color_hex,
      color_name: product.color_name,
      image: product.image,
    };
    return [self, ...siblings.filter((s) => s.id !== product.id)];
  }, [product]);

  if (!product) {
    return <div className="glass aspect-square animate-pulse rounded-3xl" />;
  }

  const displayName = pickLocalizedText(locale, product.name, product.name_en);
  const displayShort = pickLocalizedText(locale, product.short_description, product.short_description_en);
  const displayDescription = pickLocalizedText(locale, product.description, product.description_en);
  const displayCategory = pickLocalizedText(locale, product.category_name, product.category_name_en);

  const handleAdd = () => {
    if (!canAdd || !variantIdForCart) return;
    addToCart({
      productId: product.id,
      productVariantId: variantIdForCart,
      name: activeVariant ? `${displayName} (${activeVariant.name})` : displayName,
      price: displayPrice,
      image: normalizeProductImagePath(product.image ?? product.images?.[0]),
      variantLabel: activeVariant?.name ?? null,
      maxQuantity: stockMax,
    }, qty, { fromEl: document.querySelector('[data-fly-source="product-hero"]') });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const siblings = product.color_siblings ?? [];
  const showColors = siblings.length > 0 || product.color_hex || product.color_name;

  const applyProductVariant = (data: ProductDetail, dir: number) => {
    setVariantSlideDir(dir);
    setProduct(data);
    const sizes = data.size_variants ?? [];
    const defaultSize = sizes.find((s) => s.is_default) ?? sizes.find((s) => s.in_stock) ?? sizes[0];
    setSelectedVariantId(defaultSize?.id ?? data.variant_id ?? null);
    setQty(1);
    setAdded(false);
    window.setTimeout(() => setVariantSlideDir(0), 500);
  };

  const onColorSelect = async (variant: ColorVariant, direction: 1 | -1) => {
    if (variant.id === product.id || colorSwitching) return;
    setColorSwitching(true);
    try {
      const data = unwrap<ProductDetail>(await storeApi.product(variant.id));
      applyProductVariant(data, direction);
      navigate(`/product/${variant.id}`, { replace: true });
    } catch {
      /* keep current */
    } finally {
      setColorSwitching(false);
    }
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
            productVariantId: variantIdForCart,
            name: displayName,
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
        <ProductImageGallery
          productId={product.id}
          variantSlideDirection={variantSlideDir}
          name={displayName}
          image={product.image}
          images={product.images}
        />
        <div
          key={product.id}
          className={cn('p-5', variantSlideDir !== 0 && 'product-detail-variant-in')}
          style={variantSlideDir !== 0 ? ({ '--slide-dir': String(variantSlideDir) } as Record<string, string>) : undefined}
        >
          {displayCategory ? (
            <p className="text-xs font-semibold text-[var(--primary)]">{displayCategory}</p>
          ) : null}
          <h1 className="mt-1 text-xl font-bold">{displayName}</h1>
          {displayShort ? (
            <p className="mt-2 text-sm text-[#6f6b7d]">{displayShort}</p>
          ) : null}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--primary)]">{formatPrice(displayPrice)}</span>
            {product.compare_at_price && product.compare_at_price > displayPrice ? (
              <span className="text-sm text-[#8a8da8] line-through">{formatPrice(product.compare_at_price)}</span>
            ) : null}
          </div>

          {showColors && colorVariants.length > 0 ? (
            <div className="mt-4">
              <ProductColorSwatches
                variants={colorVariants}
                activeId={product.id}
                label={t.chooseColor}
                onSelect={(v, dir) => void onColorSelect(v, dir)}
              />
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

          {displayDescription ? (
            <p className="mt-4 text-sm leading-relaxed text-[#6f6b7d]">{displayDescription}</p>
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
          <button
            type="button"
            disabled={stockMax > 0 && qty >= stockMax}
            onClick={() => setQty((q) => (stockMax > 0 ? Math.min(stockMax, q + 1) : q + 1))}
            className="glass flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
          >
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
