import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard, type ProductCardData } from '../components/product/ProductCard';
import { storeApi, unwrap } from '../lib/api';
import { useLocale } from '../providers/locale-provider';

export function ShopPage() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const categoryId = params.get('category') || '';
  const search = params.get('search') || '';
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storeApi.products({
        search: search || undefined,
        category_id: categoryId || undefined,
        per_page: 40,
      });
      const data = unwrap<{ data: ProductCardData[] }>(res);
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="reveal-up text-xl font-bold">{t.shop}</h1>
      {search ? (
        <p className="text-xs text-[#8a8da8]">{t.searchResults}: &quot;{search}&quot;</p>
      ) : null}

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass reveal-up rounded-2xl py-16 text-center text-sm text-[#8a8da8]">{t.noProducts}</div>
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
