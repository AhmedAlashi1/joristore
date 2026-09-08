import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi, unwrap } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/utils';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';

type Promo = { id: number; title: string; title_en?: string | null; image: string; link: string };

export function PromoCarousel() {
  const { locale } = useLocale();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    storeApi.promoBanners()
      .then((r) => setPromos(unwrap<Promo[]>(r)))
      .catch(() => undefined);
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
    const timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[active] ?? slides[0];

  return (
    <section className="reveal-up space-y-2">
      <Link to={current.link} className="promo-banner card-pop block overflow-hidden rounded-3xl shadow-lg">
        <img
          src={resolveMediaUrl(current.image)}
          alt={current.alt}
          className="h-36 w-full object-cover transition-opacity duration-500"
          draggable={false}
        />
      </Link>
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
