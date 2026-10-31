import { useEffect, useMemo, useState } from 'react';
import { storeApi, unwrap } from './api';
import type { CartItem } from '../providers/cart-provider';

type ProductThumb = { image?: string | null };

/** Fills missing cart line images from product API (older localStorage carts). */
export function useCartItemImages(items: CartItem[]) {
  const [byProductId, setByProductId] = useState<Record<number, string>>({});

  const missingProductIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) {
      if (!item.image) ids.add(item.productId);
    }
    return [...ids].sort((a, b) => a - b).join(',');
  }, [items]);

  useEffect(() => {
    if (!missingProductIds) return;
    const ids = missingProductIds.split(',').map(Number).filter(Boolean);
    let cancelled = false;

    void Promise.all(
      ids.map(async (productId) => {
        try {
          const res = await storeApi.product(productId);
          const data = unwrap<ProductThumb>(res);
          return { productId, image: data.image ?? null };
        } catch {
          return { productId, image: null };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setByProductId((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          if (row.image) next[row.productId] = row.image;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [missingProductIds]);

  const resolveImage = (item: CartItem) => item.image ?? byProductId[item.productId] ?? null;

  return { resolveImage };
}
