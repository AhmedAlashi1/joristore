import { Link } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';
import { cn, formatPrice, resolveMediaUrl } from '../../lib/utils';

export type ProductCardData = {
  id: number;
  name: string;
  price: number;
  variant_id?: number;
  compare_at_price?: number;
  in_stock?: boolean;
  featured?: boolean;
  category_name?: string;
  image?: string | null;
};

export function ProductCard({ product, index = 0, className }: { product: ProductCardData; index?: number; className?: string }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'glass-strong card-pop glass-interactive group block overflow-hidden rounded-2xl',
        `stagger-${Math.min(index + 1, 6)}`,
        className,
      )}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-soft)] via-white/30 to-transparent">
        {product.image ? (
          <img src={resolveMediaUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105" loading="lazy" />
        ) : (
          <span className="text-5xl font-black text-[var(--primary)] opacity-20 transition-transform duration-500 group-active:scale-125">
            {product.name.charAt(0)}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 transition-opacity duration-300 group-active:opacity-100" />
        {product.featured ? (
          <span className="absolute start-2 top-2 animate-pulse rounded-lg bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            مميز
          </span>
        ) : null}
        {product.in_stock === false ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-bold text-white backdrop-blur-sm">
            نفذ
          </span>
        ) : null}
        <div className="absolute end-2 top-2 z-10">
          <FavoriteButton
            product={{
              productId: product.id,
              productVariantId: product.variant_id,
              name: product.name,
              price: product.price,
              compare_at_price: product.compare_at_price,
              in_stock: product.in_stock,
              category_name: product.category_name,
              featured: product.featured,
            }}
          />
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
        {product.category_name ? (
          <p className="mt-0.5 text-[10px] font-medium text-[#8a8da8]">{product.category_name}</p>
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
