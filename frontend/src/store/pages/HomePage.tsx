import { Sparkles, Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { getCachedHome, HOME_CACHE_KEY, prefetchStoreHome } from '../lib/prefetch-home';
import { readStoreCache } from '../lib/store-cache';
import { useLocale } from '../providers/locale-provider';

type Category = { id: number; name: string; slug: string; image?: string | null };

function initialHomeState() {
  const cached = getCachedHome();
  return {
    categories: cached?.categories ?? [],
    featured: (cached?.featured ?? []) as ProductCardData[],
    hasCache: Boolean(cached),
  };
}

export function HomePage() {
  const { t } = useLocale();
  const [initial] = useState(initialHomeState);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [featured, setFeatured] = useState<ProductCardData[]>(initial.featured);
  const [loaded, setLoaded] = useState(initial.hasCache);

  useEffect(() => {
    let cancelled = false;

    void prefetchStoreHome().then(() => {
      if (cancelled) return;
      const fresh = readStoreCache<{ categories: Category[]; featured: ProductCardData[] }>(HOME_CACHE_KEY);
      if (fresh) {
        setCategories(fresh.categories);
        setFeatured(fresh.featured);
      }
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-page space-y-4 pb-2">
      <PromoCarousel />

      {categories.length > 0 ? (
        <section>
          <div className="section-head mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Tags size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h2 className="section-title">{t.categories}</h2>
            </div>
            <Link to="/shop" className="section-link shrink-0">
              {t.allCategories}
            </Link>
          </div>
          <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-0.5">
            {categories.map((c) => (
              <Link key={c.id} to={`/shop?category=${c.id}`} className="category-tile shrink-0">
                <span className="category-tile-img overflow-hidden shadow-sm">
                  <StoreMediaImage src={c.image} alt={c.name} />
                </span>
                <span className="category-tile-label">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section>
          <div className="section-head mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h2 className="section-title">{t.featured}</h2>
            </div>
            <Link to="/shop" className="section-link shrink-0">
              {t.viewAll}
            </Link>
          </div>
          <div className="product-grid product-grid-home">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} compact />
            ))}
          </div>
        </section>
      ) : loaded && featured.length === 0 ? (
        <div className="glass rounded-2xl py-8 text-center text-sm text-store-muted">{t.noProducts}</div>
      ) : null}
    </div>
  );
}
