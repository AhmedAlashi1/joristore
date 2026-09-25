import { Sparkles, Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { storeApi, unwrap } from '../lib/api';
import { useLocale } from '../providers/locale-provider';

type Category = { id: number; name: string; slug: string; image?: string | null };

const HOME_FEATURED_LIMIT = 4;
const HOME_CATEGORIES_LIMIT = 6;

export function HomePage() {
  const { t } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      storeApi.categories().then((r) => unwrap<Category[]>(r)),
      storeApi.products({ featured: true, per_page: HOME_FEATURED_LIMIT }).then((r) =>
        unwrap<{ data: ProductCardData[] }>(r),
      ),
    ])
      .then(([cats, prods]) => {
        setCategories(cats.slice(0, HOME_CATEGORIES_LIMIT));
        setFeatured((prods.data || []).slice(0, HOME_FEATURED_LIMIT));
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
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
