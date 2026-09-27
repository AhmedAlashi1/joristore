import { LayoutGrid } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import {
  ShopFilters,
  ShopFiltersBar,
  type ShopFilterOptions,
  type ShopSort,
} from '../components/shop/ShopFilters';
import { storeApi, unwrap } from '../lib/api';
import { findCategory, type StoreCategory } from '../lib/category-tree';
import { pickLocalizedText } from '../lib/localized-text';
import { useLocale } from '../providers/locale-provider';

const emptyFilters: ShopFilterOptions = { brands: [], colors: [], sizes: [] };

export function ShopPage() {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') || '';
  const search = params.get('search') || '';
  const smart = params.get('smart') || '';
  const brandId = params.get('brand') || '';
  const color = params.get('color') || '';
  const size = params.get('size') || '';
  const sort = (params.get('sort') || '') as ShopSort;
  const onSale = params.get('on_sale') || '';

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [smartSummary, setSmartSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [filterOptions, setFilterOptions] = useState<ShopFilterOptions>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    storeApi.categories().then((r) => setCategories(unwrap(r))).catch(() => undefined);
  }, []);

  const activeCategory = useMemo(
    () => (categoryId ? findCategory(categories, Number(categoryId)) : undefined),
    [categories, categoryId],
  );

  const categoryTitle = activeCategory
    ? pickLocalizedText(locale, activeCategory.name, activeCategory.name_en)
    : t.shop;

  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('brand');
    next.delete('color');
    next.delete('size');
    next.delete('sort');
    setParams(next);
  };

  const activeFilterCount = [brandId, color, size, sort].filter(Boolean).length;

  useEffect(() => {
    if (smart) return;
    storeApi
      .productFilters({
        category_id: categoryId || undefined,
        search: search || undefined,
      })
      .then((r) => setFilterOptions(unwrap<ShopFilterOptions>(r)))
      .catch(() => setFilterOptions(emptyFilters));
  }, [categoryId, search, smart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (smart) {
        const res = await storeApi.smartSearch(smart, locale);
        const data = unwrap<{ products: ProductCardData[]; summary?: string }>(res);
        setProducts(data.products || []);
        setSmartSummary(data.summary || '');
      } else {
        const res = await storeApi.products({
          search: search || undefined,
          category_id: categoryId || undefined,
          brand_id: brandId || undefined,
          color: color || undefined,
          size: size || undefined,
          sort: sort || undefined,
          on_sale: onSale ? true : undefined,
          per_page: 40,
        });
        const data = unwrap<{ data: ProductCardData[] }>(res);
        setProducts(data.data || []);
        setSmartSummary('');
      }
    } catch {
      setProducts([]);
      setSmartSummary('');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, brandId, color, size, sort, onSale, smart, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search || smart ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search, smart]);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--fg)]">{categoryTitle}</h1>
        <Link to="/categories" className="glass flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-[var(--primary)]">
          <LayoutGrid size={14} />
          {t.categories}
        </Link>
      </div>

      {!smart ? (
        <>
          <ShopFiltersBar
            activeCount={activeFilterCount}
            onOpen={() => setFiltersOpen(true)}
            sort={sort}
            brandId={brandId}
            color={color}
            size={size}
            options={filterOptions}
            onBrandId={(v) => setFilterParam('brand', v)}
            onColor={(v) => setFilterParam('color', v)}
            onSize={(v) => setFilterParam('size', v)}
            onSort={(v) => setFilterParam('sort', v)}
          />
          <ShopFilters
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            options={filterOptions}
            brandId={brandId}
            color={color}
            size={size}
            sort={sort}
            onBrandId={(v) => setFilterParam('brand', v)}
            onColor={(v) => setFilterParam('color', v)}
            onSize={(v) => setFilterParam('size', v)}
            onSort={(v) => setFilterParam('sort', v)}
            onClear={clearFilters}
          />
        </>
      ) : null}

      {smart ? (
        <div className="glass rounded-2xl p-3 text-sm">
          <p className="font-bold text-[var(--fg)]">{t.smartSearch}: &quot;{smart}&quot;</p>
          {smartSummary ? <p className="mt-1 text-store-muted">{smartSummary}</p> : null}
        </div>
      ) : null}
      {search ? (
        <p className="text-xs font-semibold text-store-muted">{t.searchResults}: &quot;{search}&quot;</p>
      ) : null}

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-store-muted">{t.noProducts}</div>
      ) : (
        <div className="product-grid">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
