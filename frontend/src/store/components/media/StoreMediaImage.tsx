import { useEffect, useState } from 'react';
import { DEFAULT_LOGO } from '../../lib/store-brand';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { getMediaCacheBust } from '../../lib/media-cache-bust';
import { cn, resolveMediaUrl } from '../../lib/utils';

type StoreMediaImageProps = {
  src?: string | null;
  /** Category/product updated_at or pull-refresh bust — skips stale PWA image cache */
  cacheVersion?: string | number | null;
  alt: string;
  className?: string;
  /** cover for photos, contain for logo fallback */
  fit?: 'cover' | 'contain';
  /** fill parent box vs natural width (full image visible, no letterboxing) */
  layout?: 'fill' | 'intrinsic';
};

export function StoreMediaImage({
  src,
  cacheVersion,
  alt,
  className,
  fit = 'cover',
  layout = 'fill',
}: StoreMediaImageProps) {
  const { logo } = useStoreBrand();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bust = getMediaCacheBust();
  const version = cacheVersion ?? (bust || undefined);
  const resolved = src ? resolveMediaUrl(src, version) : '';
  const showLogo = !resolved || failed;

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src, version]);

  if (showLogo) {
    return (
      <img
        src={logo || DEFAULT_LOGO}
        alt={alt}
        className={cn(
          'h-full w-full bg-[var(--primary-soft)] object-contain p-3 opacity-100',
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
      className={cn(
        'h-full w-full transition-opacity duration-300 ease-out',
        fit === 'cover' ? 'object-cover object-center' : 'object-contain',
        loaded ? 'opacity-100 product-img-reveal' : 'opacity-0',
        className,
      )}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
