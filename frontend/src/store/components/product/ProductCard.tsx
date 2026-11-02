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
  category_name_en?: string | null;
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
  onNavigate,
}: {
  product: ProductCardData;
  index?: number;
  className?: string;
  compact?: boolean;
  rail?: boolean;
  /** e.g. close search overlay before route change */
  onNavigate?: () => void;
}) {
  const { locale, t } = useLocale();
  const displayName = pickLocalizedText(locale, product.name, product.name_en);
  const displayCategory = pickLocalizedText(locale, product.category_name, product.category_name_en);

  return (
    <Link
      to={`/product/${product.id}`}
      onClick={() => onNavigate?.()}
      className={cn(
        'product-card glass-strong glass-interactive group flex h-full flex-col overflow-hidden rounded-2xl',
        rail && 'product-card-rail w-[9.25rem] shrink-0 snap-start',
        !rail && !compact && 'card-pop',
        !rail && !compact && `stagger-${Math.min(index + 1, 6)}`,
        className,
      )}
      style={compact ? undefined : { animationDelay: `${index * 0.06}s` }}
    >
      <div className="product-card-media relative w-full shrink-0 overflow-hidden bg-[#eceef4] dark:bg-[#252538]">
        <StoreMediaImage
          src={product.image}
          alt={displayName}
          layout="fill"
          fit="cover"
          className="product-card-img transition-transform duration-[550ms] ease-out group-active:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-80" />
        {product.featured ? (
          <span className="absolute start-2 top-2 animate-pulse rounded-lg bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            مميز
          </span>
        ) : null}
        {product.in_stock === false ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-bold text-white backdrop-blur-[2px]">
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
      <div className={cn('product-card-body flex min-h-[5.75rem] flex-1 flex-col', compact ? 'p-2' : 'p-2.5')}>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[var(--fg)]">{displayName}</p>
        {product.brand_name ? (
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">{product.brand_name}</p>
        ) : (
          <span className="mt-0.5 block min-h-[14px]" aria-hidden />
        )}
        {displayCategory ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-store-muted">{displayCategory}</p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          <span className="text-base font-bold text-[var(--primary)]">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <span className="text-xs text-[#8a8da8] line-through">{formatPrice(product.compare_at_price)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
