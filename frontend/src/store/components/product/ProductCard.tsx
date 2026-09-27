import { Link } from 'react-router-dom';
import { AddToCartButton } from './AddToCartButton';
import { FavoriteButton } from './FavoriteButton';
import { StoreMediaImage } from '../media/StoreMediaImage';
import { pickLocalizedText } from '../../lib/localized-text';
import { useLocale } from '../../providers/locale-provider';
import { cn, formatPrice } from '../../lib/utils';

export type ProductCardData = {
  id: number;
  name: string;
  name_en?: string | null;
  price: number;
  variant_id?: number;
  compare_at_price?: number;
  in_stock?: boolean;
  quantity?: number;
  has_size_options?: boolean;
  featured?: boolean;
  category_name?: string;
  brand_name?: string | null;
  color_name?: string | null;
  image?: string | null;
};

export function ProductCard({
  product,
  index = 0,
  className,
  compact = false,
  rail = false,
}: {
  product: ProductCardData;
  index?: number;
  className?: string;
  compact?: boolean;
  rail?: boolean;
}) {
  const { locale, t } = useLocale();
  const displayName = pickLocalizedText(locale, product.name, product.name_en);

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'glass-strong glass-interactive group block overflow-hidden rounded-2xl',
        rail && 'product-card-rail w-[9.25rem] shrink-0 snap-start',
        !rail && !compact && 'card-pop',
        !rail && !compact && `stagger-${Math.min(index + 1, 6)}`,
        className,
      )}
      style={compact ? undefined : { animationDelay: `${index * 0.07}s` }}
    >
      <div className="relative overflow-hidden bg-neutral-100">
        <StoreMediaImage
          src={product.image}
          alt={displayName}
          layout="intrinsic"
          className="transition-transform duration-500 group-active:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 transition-opacity duration-300 group-active:opacity-100" />
        {product.featured ? (
          <span className="absolute start-2 top-2 animate-pulse rounded-lg bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            مميز
          </span>
        ) : null}
        {product.in_stock === false ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-bold text-white backdrop-blur-sm">
            {t.outOfStock}
          </span>
        ) : null}
        <div className="absolute end-2 top-2 z-10">
          <FavoriteButton
            product={{
              productId: product.id,
              productVariantId: product.variant_id,
              name: displayName,
              price: product.price,
              compare_at_price: product.compare_at_price,
              in_stock: product.in_stock,
              category_name: product.category_name,
              featured: product.featured,
            }}
          />
        </div>
        <div className="absolute bottom-2 end-2 z-10">
          <AddToCartButton
            product={{
              productId: product.id,
              productVariantId: product.variant_id,
              name: displayName,
              price: product.price,
              image: product.image,
              in_stock: product.in_stock,
              quantity: product.quantity,
              has_size_options: product.has_size_options,
            }}
          />
        </div>
      </div>
      <div className={cn('p-2.5', compact && 'p-2')}>
        <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--fg)]">{displayName}</p>
        {product.brand_name ? (
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">{product.brand_name}</p>
        ) : null}
        {product.category_name ? (
          <p className="mt-0.5 text-[11px] font-semibold text-store-muted">{product.category_name}</p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-[var(--primary)]">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <span className="text-xs text-[#8a8da8] line-through">{formatPrice(product.compare_at_price)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
