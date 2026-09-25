import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartItem = {
  productId: number;
  productVariantId: number;
  name: string;
  price: number;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productVariantId: number) => void;
  updateQty: (productVariantId: number, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartCtx | null>(null);
const STORAGE_KEY = 'jori_cart';

function normalizeItem(raw: Record<string, unknown>): CartItem | null {
  const productVariantId = Number(raw.productVariantId ?? raw.product_variant_id ?? 0);
  const productId = Number(raw.productId ?? raw.product_id ?? 0);
  if (!productVariantId || !productId) return null;
  return {
    productId,
    productVariantId,
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    quantity: Number(raw.quantity ?? 1),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Record<string, unknown>[];
      return parsed.map(normalizeItem).filter(Boolean) as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    addItem: (item, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((p) => p.productVariantId === item.productVariantId);
        if (existing) {
          return prev.map((p) =>
            p.productVariantId === item.productVariantId ? { ...p, quantity: p.quantity + qty } : p,
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    removeItem: (productVariantId) => setItems((prev) => prev.filter((p) => p.productVariantId !== productVariantId)),
    updateQty: (productVariantId, qty) => {
      if (qty <= 0) {
        setItems((prev) => prev.filter((p) => p.productVariantId !== productVariantId));
        return;
      }
      setItems((prev) => prev.map((p) => (p.productVariantId === productVariantId ? { ...p, quantity: qty } : p)));
    },
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside provider');
  return ctx;
}
