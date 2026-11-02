export function normalizeWhatsAppUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^wa\.me/i.test(trimmed) || /^api\.whatsapp\.com/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits) return `https://wa.me/${digits}`;

  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function buildWhatsAppTextUrl(phoneOrLink: string, message: string): string {
  const base = normalizeWhatsAppUrl(phoneOrLink);
  const sep = base.includes('?') ? '&' : '?';
  try {
    const u = new URL(base);
    if (u.hostname === 'wa.me' && u.pathname.replace(/\//g, '').match(/^\d+$/)) {
      return `${base}${sep}text=${encodeURIComponent(message)}`;
    }
  } catch {
    /* fall through */
  }
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}
