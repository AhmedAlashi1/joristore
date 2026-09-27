import type { MouseEvent } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../providers/cart-provider';
import { cn } from '../../lib/utils';

export type AddToCartProduct = {
  productId: number;
  productVariantId?: number;
  name: string;
  price: number;
  image?: string | null;
  in_stock?: boolean;
  quantity?: number;
  has_size_options?: boolean;
};

type AddToCartButtonProps = {
  product: AddToCartProduct;
  className?: string;
  size?: number;
};

export function AddToCartButton({ product, className, size = 18 }: AddToCartButtonProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const canQuickAdd =
    product.in_stock !== false &&
    !!product.productVariantId &&
    !product.has_size_options &&
    (product.quantity ?? 0) > 0;

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.has_size_options) {
      navigate(`/product/${product.productId}`);
      return;
    }

    if (!canQuickAdd || !product.productVariantId) return;

    addItem(
      {
        productId: product.productId,
        productVariantId: product.productVariantId,
        name: product.name,
        price: product.price,
        image: product.image,
        maxQuantity: product.quantity,
      },
      1,
    );
  };

  const disabled = !product.has_size_options && !canQuickAdd;

  return (
    <button
      type="button"
      aria-label="Add to cart"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90',
        disabled ? 'cursor-not-allowed bg-black/20 text-white/50' : 'glass bg-white/90 text-[var(--primary)] shadow-md',
        className,
      )}
    >
      <ShoppingCart size={size} />
    </button>
  );
}
