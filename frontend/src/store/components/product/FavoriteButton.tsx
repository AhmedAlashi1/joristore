import { Heart } from 'lucide-react';
import { useRef } from 'react';
import { useWishlist, type WishlistItem } from '../../providers/wishlist-provider';
import { useStoreMotion } from '../../providers/store-motion-provider';
import { cn } from '../../lib/utils';

type FavoriteButtonProps = {
  product: WishlistItem;
  className?: string;
  size?: number;
};

export function FavoriteButton({ product, className, size = 18 }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useWishlist();
  const { flyToWishlist } = useStoreMotion();
  const btnRef = useRef<HTMLButtonElement>(null);
  const active = isFavorite(product.productId);

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !active;
        toggle(product);
        if (next) {
          flyToWishlist({
            fromEl:
              btnRef.current?.closest('.product-card-media')
              ?? btnRef.current?.closest('[data-fly-source]')
              ?? btnRef.current,
          });
        }
      }}
      className={cn(
        'favorite-btn flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90',
        active ? 'favorite-btn-active' : 'glass text-[#8a8da8]',
        className,
      )}
    >
      <Heart size={size} className={cn('transition-transform', active && 'scale-110')} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
