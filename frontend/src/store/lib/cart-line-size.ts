import type { CartItem } from '../providers/cart-provider';

/** Size label from cart line (variant name or "Name (M)" pattern). */
export function cartLineSizeLabel(item: CartItem): string | null {
  if (item.variantLabel?.trim()) return item.variantLabel.trim();
  const match = item.name.match(/\(([^()]+)\)\s*$/);
  return match?.[1]?.trim() || null;
}

export function cartHasSizedLines(items: CartItem[]): boolean {
  return items.some((item) => cartLineSizeLabel(item) != null);
}
