import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCachedPromos, reloadPromoBanners, type StorePromoBanner } from '../../lib/prefetch-home';
import { getMediaCacheBust } from '../../lib/media-cache-bust';
import { usePullRefreshOutletKey } from '../../providers/pull-refresh-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn, resolveMediaUrl } from '../../lib/utils';
import { useSwipeIndex } from './useSwipeIndex';

type Slide = StorePromoBanner & { alt: string; imageVersion: string };

function PromoBannerSkeleton() {
  return (
    <div className="promo-carousel-viewport h-32 w-full overflow-hidden rounded-2xl shadow-md">
      <div className="skeleton-shimmer h-full w-full rounded-2xl" aria-hidden />
    </div>
  );
}

function PromoBannerSlide({
  slide,
  priority,
}: {
  slide: Slide;
  priority: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const url = resolveMediaUrl(slide.image, slide.imageVersion);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div className="relative h-full w-full bg-[#f0f1f6] dark:bg-[#252838]">
      {!loaded ? <div className="skeleton-shimmer absolute inset-0 opacity-70" aria-hidden /> : null}
      {url ? (
        <img
          src={url}
          alt={slide.alt}
          className={cn(
            'h-full w-full object-cover object-center transition-opacity duration-200 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      ) : null}
    </div>
  );
}

export function PromoCarousel() {
  const { locale } = useLocale();
  const refreshKey = usePullRefreshOutletKey();
  const initialCache = useRef(getCachedPromos());
  const [promos, setPromos] = useState<StorePromoBanner[]>(() => initialCache.current ?? []);
  const [fetchDone, setFetchDone] = useState(() => Boolean(initialCache.current?.length));
  const [active, setActive] = useState(0);
  const mediaBust = getMediaCacheBust();

  useEffect(() => {
    let cancelled = false;
    const force = refreshKey > 0;

    void (force ? reloadPromoBanners(true) : reloadPromoBanners(false))
      .then((list) => {
        if (!cancelled) {
          setPromos(list);
          setFetchDone(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const slides = useMemo(
    () => promos.map((p) => ({
      ...p,
      alt: locale === 'ar' ? p.title : (p.title_en || p.title),
      imageVersion: [p.updated_at, mediaBust, refreshKey].filter(Boolean).join('-'),
    })),
    [promos, locale, mediaBust, refreshKey],
  );

  const nextIndex = slides.length > 1 ? (active + 1) % slides.length : active;

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setActive((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  const { onTouchStart, onTouchEnd } = useSwipeIndex(slides.length, active, setActive);

  if (slides.length === 0) {
    return fetchDone ? null : <PromoBannerSkeleton />;
  }

  return (
    <section className="mt-2 space-y-1.5">
      <div
        className="promo-carousel-viewport relative h-32 w-full overflow-hidden rounded-2xl shadow-md"
        dir="ltr"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((p, i) => {
          const isActive = i === active;
          const shouldLoadImage = isActive || i === nextIndex;
          return (
            <Link
              key={`${p.id}-${p.imageVersion}`}
              to={p.link}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                'promo-banner absolute inset-0 block overflow-hidden transition-opacity duration-300',
                isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
              )}
            >
              {shouldLoadImage ? (
                <PromoBannerSlide slide={p} priority={isActive} />
              ) : (
                <div className="skeleton-shimmer h-full w-full opacity-40" aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {slides.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={p.alt}
              onClick={() => setActive(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === active ? 'w-6 bg-[var(--primary)]' : 'w-1.5 bg-[#c8cad8]',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
