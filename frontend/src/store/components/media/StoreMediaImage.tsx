import { useState } from 'react';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn, resolveMediaUrl } from '../../lib/utils';

type StoreMediaImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** cover for photos, contain for logo fallback */
  fit?: 'cover' | 'contain';
};

export function StoreMediaImage({
  src,
  alt,
  className,
  fit = 'cover',
}: StoreMediaImageProps) {
  const { logo } = useStoreBrand();
  const [failed, setFailed] = useState(false);
  const resolved = src ? resolveMediaUrl(src) : '';
  const showLogo = !resolved || failed;

  if (showLogo) {
    return (
      <img
        src={logo}
        alt={alt}
        className={cn(
          'h-full w-full bg-[var(--primary-soft)] object-contain p-3',
          className,
        )}
        loading="lazy"
      />
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
