import { useStoreBrand } from '../../providers/store-brand-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';
import { SocialBrandIcon, socialAriaLabels, socialBrandButtonClass } from './SocialBrandIcon';

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, '')}`;
}

export function SocialLinks({
  className,
  title,
  variant = 'compact',
}: {
  className?: string;
  title?: string;
  variant?: 'compact' | 'contact';
}) {
  const { social } = useStoreBrand();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const entries = Object.entries(social || {}).filter(
    ([key, v]) => key !== 'whatsapp' && v && String(v).trim(),
  );

  if (entries.length === 0) {
    return null;
  }

  const isContact = variant === 'contact';

  return (
    <section className={cn('glass-strong rounded-2xl px-4 py-4', isContact && 'py-6', className)}>
      {title ? (
        <p className={cn('mb-3 text-center font-bold text-store-muted', isContact ? 'text-sm' : 'text-xs')}>{title}</p>
      ) : null}
      <div className={cn('flex flex-wrap items-center justify-center', isContact ? 'gap-2.5' : 'gap-2')}>
        {entries.map(([key, url]) => {
          const label = socialAriaLabels[key]?.[ar ? 'ar' : 'en'] ?? key;
          return (
            <a
              key={key}
              href={normalizeUrl(String(url))}
              target="_blank"
              rel="noopener noreferrer"
              className={socialBrandButtonClass(key, isContact)}
              aria-label={label}
              title={label}
            >
              <SocialBrandIcon network={key} size={isContact ? 20 : 18} />
            </a>
          );
        })}
      </div>
    </section>
  );
}
