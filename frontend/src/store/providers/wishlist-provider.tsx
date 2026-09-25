import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type WishlistItem = {
  productId: number;
  productVariantId?: number;
  name: string;
  price: number;
  compare_at_price?: number;
  in_stock?: boolean;
  category_name?: string;
  featured?: boolean;
};

type WishlistCtx = {
  items: WishlistItem[];
  count: number;
  isFavorite: (productId: number) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistCtx | null>(null);
const STORAGE_KEY = 'jori_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as WishlistItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isFavorite = useCallback((productId: number) => items.some((i) => i.productId === productId), [items]);

  const toggle = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.productId === item.productId);
      if (exists) return prev.filter((p) => p.productId !== item.productId);
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<WishlistCtx>(() => ({
    items,
    count: items.length,
    isFavorite,
    toggle,
    remove,
    clear,
  }), [items, isFavorite, toggle, remove, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist outside provider');
  return ctx;
}
