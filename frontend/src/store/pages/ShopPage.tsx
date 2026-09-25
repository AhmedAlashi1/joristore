import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import { storeApi, unwrap } from '../lib/api';
import { useLocale } from '../providers/locale-provider';

export function ShopPage() {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const categoryId = params.get('category') || '';
  const search = params.get('search') || '';
  const smart = params.get('smart') || '';
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [smartSummary, setSmartSummary] = useState('');
  const [loading, setLoading] = useState(true);

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
  }, [search, categoryId, smart, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search || smart ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search, smart]);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-[var(--fg)]">{t.shop}</h1>
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
