import { useState } from 'react';
import { DEFAULT_LOGO } from '../../lib/store-brand';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn, resolveMediaUrl } from '../../lib/utils';

type StoreMediaImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** cover for photos, contain for logo fallback */
  fit?: 'cover' | 'contain';
  /** fill parent box vs natural width (full image visible, no letterboxing) */
  layout?: 'fill' | 'intrinsic';
};

export function StoreMediaImage({
  src,
  alt,
  className,
  fit = 'cover',
  layout = 'fill',
}: StoreMediaImageProps) {
  const { logo } = useStoreBrand();
  const [failed, setFailed] = useState(false);
  const resolved = src ? resolveMediaUrl(src) : '';
  const showLogo = !resolved || failed;

  if (showLogo) {
    return (
      <img
        src={logo || DEFAULT_LOGO}
        alt={alt}
        className={cn(
          'h-full w-full bg-[var(--primary-soft)] object-contain p-3',
          className,
        )}
        loading="lazy"
      />
    );
  }

  if (layout === 'intrinsic') {
    return (
      <img
        src={resolved}
        alt={alt}
        className={cn('block h-auto w-full max-w-full', className)}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
