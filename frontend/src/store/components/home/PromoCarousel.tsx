import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCachedPromos, PROMO_CACHE_KEY, prefetchStoreHome } from '../../lib/prefetch-home';
import { readStoreCache } from '../../lib/store-cache';
import { useLocale } from '../../providers/locale-provider';
import { StoreMediaImage } from '../media/StoreMediaImage';
import { cn } from '../../lib/utils';
import { useSwipeIndex } from './useSwipeIndex';

type Promo = { id: number; title: string; title_en?: string | null; image: string; link: string };

export function PromoCarousel() {
  const { locale } = useLocale();
  const [promos, setPromos] = useState<Promo[]>(() => getCachedPromos() ?? []);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void prefetchStoreHome().then(() => {
      if (cancelled) return;
      const fresh = readStoreCache<Promo[]>(PROMO_CACHE_KEY);
      if (fresh?.length) setPromos(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(
    () => promos.map((p) => ({
      ...p,
      alt: locale === 'ar' ? p.title : (p.title_en || p.title),
    })),
    [promos, locale],
  );

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
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
            <Link key={p.id} to={p.link} className="promo-banner block h-32 w-full shrink-0 overflow-hidden">
              <StoreMediaImage src={p.image} alt={p.alt} />
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
