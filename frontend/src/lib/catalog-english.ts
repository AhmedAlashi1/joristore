/** Ignore DB "English" that is just Arabic duplicated (legacy auto-fill). */
export function sanitizeCatalogEnglishField(ar: string, en: string | null | undefined): string {
  const a = ar.trim();
  const e = (en ?? '').trim();
  if (!e) return '';
  if (e === a) return '';
  const hasArabic = /[\u0600-\u06FF]/.test(e);
  const hasLatin = /[A-Za-z]/.test(e);
  if (hasArabic && !hasLatin) return '';

  return e;
}
