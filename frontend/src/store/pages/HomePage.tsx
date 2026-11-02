import { Flame, Sparkles, Tags, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { HomeProductRail } from '../components/home/HomeProductRail';
import { GymSpotlight } from '../components/home/GymSpotlight';
import { SocialLinks } from '../components/social/SocialLinks';
import type { ProductCardData } from '../components/product/ProductCard';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { getCachedHome, HOME_CACHE_KEY, prefetchStoreHome } from '../lib/prefetch-home';
import { readStoreCache } from '../lib/store-cache';
import { usePullRefreshOutletKey } from '../providers/pull-refresh-provider';
import { pickLocalizedText } from '../lib/localized-text';
import { useLocale } from '../providers/locale-provider';

type Category = {
  id: number;
  name: string;
  name_en?: string | null;
  slug: string;
  parent_id?: number | null;
  image?: string | null;
  updated_at?: string | null;
};

function initialHomeState() {
  const cached = getCachedHome();
  return {
    categories: cached?.categories ?? [],
    newArrivals: cached?.newArrivals ?? [],
    bestSellers: cached?.bestSellers ?? [],
    weeklyDeals: cached?.weeklyDeals ?? [],
    hasCache: Boolean(cached),
  };
}

export function HomePage() {
  const { t, locale } = useLocale();
  const [initial] = useState(initialHomeState);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [newArrivals, setNewArrivals] = useState<ProductCardData[]>(initial.newArrivals);
  const [bestSellers, setBestSellers] = useState<ProductCardData[]>(initial.bestSellers);
  const [weeklyDeals, setWeeklyDeals] = useState<ProductCardData[]>(initial.weeklyDeals);
  const [loaded, setLoaded] = useState(initial.hasCache);
  const pullKey = usePullRefreshOutletKey();

  useEffect(() => {
    let cancelled = false;

    void prefetchStoreHome(pullKey > 0 ? { force: true } : undefined).then(() => {
      if (cancelled) return;
      const fresh = readStoreCache<{
        categories: Category[];
        newArrivals: ProductCardData[];
        bestSellers: ProductCardData[];
        weeklyDeals: ProductCardData[];
      }>(HOME_CACHE_KEY);
      if (fresh) {
        setCategories(fresh.categories);
        setNewArrivals(fresh.newArrivals);
        setBestSellers(fresh.bestSellers);
        setWeeklyDeals(fresh.weeklyDeals);
      }
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [pullKey]);

  const hasProducts = newArrivals.length + bestSellers.length + weeklyDeals.length > 0;

  return (
    <div className="home-page space-y-5 pb-2">
      <PromoCarousel />

      {categories.length > 0 ? (
        <section>
          <div className="section-head mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Tags size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h2 className="section-title">{t.categories}</h2>
            </div>
            <Link to="/categories" className="section-link shrink-0">
              {t.allCategories}
            </Link>
          </div>
          <div className="home-category-rail hide-scrollbar flex gap-2.5 overflow-x-auto pb-0.5 snap-x snap-mandatory">
            {categories.map((c) => {
              const label = pickLocalizedText(locale, c.name, c.name_en);
              return (
              <Link key={c.id} to={`/categories?parent=${c.id}`} className="category-tile shrink-0 snap-start">
                <span className="category-tile-img overflow-hidden shadow-sm">
                  <StoreMediaImage src={c.image} cacheVersion={c.updated_at} alt={label} />
                </span>
                <span className="category-tile-label">{label}</span>
              </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <HomeProductRail
        title={t.newArrivals}
        icon={<Sparkles size={18} className="shrink-0 text-[var(--primary)]" />}
        products={newArrivals}
        shopLink="/shop?sort=new"
      />
      <HomeProductRail
        title={t.bestSellers}
        icon={<Flame size={18} className="shrink-0 text-[#ff9f43]" />}
        products={bestSellers}
        shopLink="/shop?sort=bestseller"
      />
      <HomeProductRail
        title={t.weeklyDeals}
        icon={<Truck size={18} className="shrink-0 text-[var(--accent)]" />}
        products={weeklyDeals}
        shopLink="/shop?on_sale=1"
      />

      <GymSpotlight />

      {!hasProducts && loaded ? (
        <div className="glass rounded-2xl py-8 text-center text-sm text-store-muted">{t.noProducts}</div>
      ) : null}

      <SocialLinks className="pb-2" title={t.followUs} />
    </div>
  );
}
