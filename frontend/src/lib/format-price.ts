import { loadCachedStoreBrand } from '../store/lib/store-brand';

const DEFAULT_SYMBOL = '₪';

let adminCurrencySymbol = DEFAULT_SYMBOL;

/** Admin panel: set after loading store settings. */
export function setAdminCurrencySymbol(symbol: string) {
  adminCurrencySymbol = symbol.trim() || DEFAULT_SYMBOL;
}

export function getCurrencySymbol(): string {
  return loadCachedStoreBrand()?.currencySymbol?.trim() || adminCurrencySymbol || DEFAULT_SYMBOL;
}

export function formatPrice(amount: number, symbol?: string): string {
  const sym = symbol ?? getCurrencySymbol();
  const value = Number(amount);
  const formatted = Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0';
  return `${formatted} ${sym}`;
}
