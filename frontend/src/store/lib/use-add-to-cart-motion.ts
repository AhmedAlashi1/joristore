import { useCallback } from 'react';
import type { CartItem } from '../providers/cart-provider';
import { useCart } from '../providers/cart-provider';
import { useStoreMotion } from '../providers/store-motion-provider';

type AddOpts = {
  fromEl?: Element | null;
};

export function useAddToCartMotion() {
  const { addItem } = useCart();
  const { flyToCart } = useStoreMotion();

  return useCallback(
    (item: Omit<CartItem, 'quantity'>, qty = 1, opts?: AddOpts) => {
      flyToCart({
        imageUrl: item.image,
        fromEl: opts?.fromEl ?? null,
        bursts: qty,
      });
      addItem(item, qty);
    },
    [addItem, flyToCart],
  );
}
