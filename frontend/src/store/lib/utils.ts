import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = 'SAR') {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Resolve category/product image paths from API (relative or absolute URL). */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/storage/')) {
    const origin = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_BACKEND_ORIGIN;
    if (origin) return `${origin}${path}`;
    return path;
  }
  if (path.startsWith('/')) return path;
  return `/${path.replace(/^\/+/, '')}`;
}
