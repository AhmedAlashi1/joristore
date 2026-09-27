import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatPrice, getCurrencySymbol } from '../../lib/format-price';
export { absoluteStorageUrl as resolveMediaUrl } from '../../lib/storage-origin';
