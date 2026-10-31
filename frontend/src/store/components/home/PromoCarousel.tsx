import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCachedPromos, reloadPromoBanners, type StorePromoBanner } from '../../lib/prefetch-home';
import { getMediaCacheBust } from '../../lib/media-cache-bust';
import { usePullRefreshOutletKey } from '../../providers/pull-refresh-provider';
import { useLocale } from '../../providers/locale-provider';
import { StoreMediaImage } from '../media/StoreMediaImage';
import { cn } from '../../lib/utils';
import { useSwipeIndex } from './useSwipeIndex';

export function PromoCarousel() {
  const { locale } = useLocale();
  const refreshKey = usePullRefreshOutletKey();
  const [promos, setPromos] = useState<StorePromoBanner[]>(() => getCachedPromos() ?? []);
  const [active, setActive] = useState(0);
  const mediaBust = getMediaCacheBust();

  useEffect(() => {
    let cancelled = false;
    const force = refreshKey > 0;

    void (force ? reloadPromoBanners(true) : reloadPromoBanners(false))
      .then((list) => {
        if (!cancelled) setPromos(list);
      })
      .catch(() => undefined);

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

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setActive((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  const { onTouchStart, onTouchEnd } = useSwipeIndex(slides.length, active, setActive);

  if (slides.length === 0) return null;

  return (
    <section className="mt-2 space-y-1.5">
      <div
        className="promo-carousel-track relative overflow-hidden rounded-2xl shadow-md"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((p) => (
            <Link key={`${p.id}-${p.imageVersion}`} to={p.link} className="promo-banner block h-32 w-full shrink-0 overflow-hidden">
              <StoreMediaImage src={p.image} cacheVersion={p.imageVersion} alt={p.alt} />
            </Link>
          ))}
        </div>
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
