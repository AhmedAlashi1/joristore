import { ArrowRight, ChevronLeft, LayoutGrid } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { storeApi, unwrap } from '../lib/api';
import {
  ancestorChain,
  childrenOf,
  hasChildren,
  rootCategories,
  type StoreCategory,
} from '../lib/category-tree';
import { useLocale } from '../providers/locale-provider';

export function CategoriesPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const parentParam = params.get('parent');
  const parentId = parentParam ? Number(parentParam) : null;

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeApi
      .categories()
      .then((r) => setCategories(unwrap<StoreCategory[]>(r)))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const breadcrumbs = useMemo(
    () => (parentId ? ancestorChain(categories, parentId) : []),
    [categories, parentId],
  );

  const current = parentId ? categories.find((c) => c.id === parentId) : null;
  const visible = useMemo(() => {
    if (parentId) return childrenOf(categories, parentId);
    return rootCategories(categories);
  }, [categories, parentId]);

  const openCategory = (cat: StoreCategory) => {
    if (hasChildren(categories, cat.id)) {
      setParams({ parent: String(cat.id) });
      return;
    }
    navigate(`/shop?category=${cat.id}`);
  };

  return (
    <div className="categories-page space-y-4 pb-4">
      <div className="flex items-center gap-2">
        {parentId ? (
          <button
            type="button"
            onClick={() => {
              const up = current?.parent_id;
              if (up) setParams({ parent: String(up) });
              else setParams({});
            }}
            className="glass flex h-10 w-10 items-center justify-center rounded-xl"
            aria-label={t.backToCategories}
          >
            <ArrowRight size={20} className="rtl:rotate-180" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <LayoutGrid size={22} className="text-[var(--primary)]" />
            {current?.name ?? t.categoriesBrowse}
          </h1>
          <p className="text-xs text-store-muted">{t.sportsWorldSubtitle}</p>
        </div>
      </div>

      {breadcrumbs.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-1 text-xs text-store-muted">
          <Link to="/categories" className="font-semibold text-[var(--primary)]" onClick={() => setParams({})}>
            {t.categories}
          </Link>
          {breadcrumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronLeft size={12} className="opacity-50 rtl:rotate-180" />
              {c.id === parentId ? (
                <span className="font-bold text-[var(--fg)]">{c.name}</span>
              ) : (
                <button type="button" className="font-semibold text-[var(--primary)]" onClick={() => setParams({ parent: String(c.id) })}>
                  {c.name}
                </button>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      {parentId && current ? (
        <Link
          to={`/shop?category=${current.id}`}
          className="glass-strong block rounded-2xl px-4 py-3 text-center text-sm font-bold text-[var(--primary)]"
        >
          {t.allInCategory}: {current.name}
        </Link>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center text-sm text-store-muted">{t.noProducts}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((cat) => {
            const isBranch = hasChildren(categories, cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => openCategory(cat)}
                className="category-dept-card glass-strong glass-interactive flex flex-col overflow-hidden rounded-2xl text-start"
              >
                <span className="category-dept-img relative block aspect-[4/3] w-full overflow-hidden bg-[var(--primary-soft)]">
                  <StoreMediaImage src={cat.image} alt={cat.name} />
                  {isBranch ? (
                    <span className="absolute bottom-2 start-2 rounded-lg bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">
                      {ar ? 'أقسام فرعية' : 'Subcategories'}
                    </span>
                  ) : null}
                </span>
                <span className="px-3 py-2.5 text-sm font-bold leading-snug">{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <Link to="/shop" className="block text-center text-sm font-semibold text-[var(--primary)]">
        {t.viewAllShop}
      </Link>
    </div>
  );
}
