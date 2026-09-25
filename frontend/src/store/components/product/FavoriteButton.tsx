import { Heart } from 'lucide-react';
import { useWishlist, type WishlistItem } from '../../providers/wishlist-provider';
import { cn } from '../../lib/utils';

type FavoriteButtonProps = {
  product: WishlistItem;
  className?: string;
  size?: number;
};

export function FavoriteButton({ product, className, size = 18 }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useWishlist();
  const active = isFavorite(product.productId);

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
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
