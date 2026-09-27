export type StoreLocale = 'ar' | 'en';

export function pickLocalizedText(
  locale: StoreLocale,
  ar: string | null | undefined,
  en: string | null | undefined,
): string {
  const primary = locale === 'ar' ? ar : en;
  if (primary?.trim()) return primary.trim();
  return (ar?.trim() || en?.trim() || '');
}
