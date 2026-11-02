import { useEffect, useMemo, useState } from 'react';
import { storeApi, unwrap } from './api';
import type { CartItem } from '../providers/cart-provider';
import { normalizeProductImagePath, pickProductImage } from './product-image';

type ProductThumb = { image?: string | null; images?: string[] | null };

function isUsableImage(path?: string | null): boolean {
  return normalizeProductImagePath(path) != null;
}

/** Loads product thumbnails for cart / checkout (fixes legacy carts + wrong paths). */
export function useCartItemImages(items: CartItem[]) {
  const [byProductId, setByProductId] = useState<Record<number, string>>({});

  const productIdsKey = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) ids.add(item.productId);
    return [...ids].sort((a, b) => a - b).join(',');
  }, [items]);

  useEffect(() => {
    if (!productIdsKey) return;
    const ids = productIdsKey.split(',').map(Number).filter(Boolean);
    let cancelled = false;

    void Promise.all(
      ids.map(async (productId) => {
        try {
          const res = await storeApi.product(productId);
          const data = unwrap<ProductThumb>(res);
          const image = pickProductImage(data);
          return { productId, image };
        } catch {
          return { productId, image: null as string | null };
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
  }, [productIdsKey]);

  const resolveImage = (item: CartItem) => {
    const fromItem = normalizeProductImagePath(item.image);
    if (isUsableImage(fromItem)) return fromItem;
    const fromApi = byProductId[item.productId];
    return normalizeProductImagePath(fromApi) ?? null;
  };

  return { resolveImage };
}
