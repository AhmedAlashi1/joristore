import { useStoreBrand } from '../../providers/store-brand-provider';
import { socialAriaLabels, SocialBrandIcon, socialBrandButtonClass } from './SocialBrandIcon';
import { useLocale } from '../../providers/locale-provider';

function normalizeWhatsAppUrl(url: string) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^wa\.me/i.test(trimmed) || /^api\.whatsapp\.com/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits) return `https://wa.me/${digits}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function WhatsAppFab() {
  const { social } = useStoreBrand();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const raw = social?.whatsapp?.trim();
  if (!raw) return null;

  const label = socialAriaLabels.whatsapp[ar ? 'ar' : 'en'];

  return (
    <a
      href={normalizeWhatsAppUrl(raw)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${socialBrandButtonClass('whatsapp', false)} whatsapp-fab fixed z-[46] shadow-lg`}
      style={{
        left: 'max(12px, calc(50% - 240px + 12px))',
        bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 10px)',
      }}
      aria-label={label}
      title={label}
    >
      <SocialBrandIcon network="whatsapp" size={20} />
    </a>
  );
}
