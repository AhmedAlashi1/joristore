import { ExternalLink, MessageCircle } from 'lucide-react';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn } from '../../lib/utils';

const labels: Record<string, string> = {
  instagram: 'IG',
  facebook: 'FB',
  twitter: 'X',
  tiktok: 'TT',
  snapchat: 'SC',
  youtube: 'YT',
  whatsapp: 'WA',
};

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
  const entries = Object.entries(social || {}).filter(([, v]) => v && String(v).trim());

  if (entries.length === 0) {
    if (variant === 'contact') {
      return (
        <div className={cn('glass-strong rounded-2xl px-4 py-10 text-center text-sm text-[#8a8da8]', className)}>
          {title ?? '—'}
        </div>
      );
    }
    return null;
  }

  const isContact = variant === 'contact';

  return (
    <section className={cn('glass-strong rounded-2xl px-4 py-4', isContact && 'py-6', className)}>
      {title ? (
        <p className={cn('mb-3 text-center font-bold text-store-muted', isContact ? 'text-sm' : 'text-xs')}>{title}</p>
      ) : null}
      <div className={cn('flex flex-wrap items-center justify-center', isContact ? 'gap-3' : 'gap-2')}>
        {entries.map(([key, url]) => (
          <a
            key={key}
            href={normalizeUrl(String(url))}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'social-link-btn flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary-soft)] font-bold text-[var(--primary)] transition-transform active:scale-95',
              isContact ? 'min-h-12 min-w-[4.5rem] px-4 py-3 text-sm' : 'h-10 min-w-10 px-2.5 text-xs',
            )}
            aria-label={key}
          >
            {labels[key] ?? <MessageCircle size={isContact ? 18 : 16} />}
            {!labels[key] ? null : <ExternalLink size={10} className="opacity-60" />}
          </a>
        ))}
      </div>
    </section>
  );
}
