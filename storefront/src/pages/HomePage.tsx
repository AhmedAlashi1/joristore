import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PromoCarousel } from '../components/home/PromoCarousel';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import { storeApi, unwrap } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';
import { useLocale } from '../providers/locale-provider';

type Category = { id: number; name: string; slug: string; image?: string | null };

export function HomePage() {
  const { t } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      storeApi.categories().then((r) => unwrap<Category[]>(r)),
      storeApi.products({ featured: true, per_page: 6 }).then((r) => unwrap<{ data: ProductCardData[] }>(r)),
    ]).then(([cats, prods]) => {
      setCategories(cats.slice(0, 8));
      setFeatured(prods.data || []);
    }).catch(() => undefined).finally(() => setLoaded(true));
  }, []);

  return (
    <div className="space-y-5 pb-4">
      <PromoCarousel />

      {categories.length > 0 ? (
        <section className="reveal-up stagger-2">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-bold">{t.categories}</h2>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            <Link to="/shop" className="category-tile shrink-0">
              <span className="category-tile-img glass flex items-center justify-center text-lg font-bold text-[var(--primary)]">
                ☰
              </span>
              <span className="category-tile-label">{t.allCategories}</span>
            </Link>
            {categories.map((c, i) => (
              <Link
                key={c.id}
                to={`/shop?category=${c.id}`}
                className={`category-tile shrink-0 stagger-${Math.min(i + 1, 6)}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="category-tile-img overflow-hidden shadow-md">
                  {c.image ? (
                    <img src={resolveMediaUrl(c.image)} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-lg font-bold text-white">
                      {c.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="category-tile-label">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="reveal-up stagger-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">{t.featured}</h2>
            <Link to="/shop" className="text-xs font-semibold text-[var(--primary)]">{t.viewAll}</Link>
          </div>
          <div className="product-grid">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      ) : loaded && featured.length === 0 ? (
        <div className="glass reveal-up rounded-2xl py-12 text-center text-sm text-[#8a8da8]">
          {t.noProducts}
        </div>
      ) : null}
    </div>
  );
}
