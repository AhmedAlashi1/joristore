import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import type { ProductOption } from './product-shared';

export function useProductOptions() {
  const [categories, setCategories] = useState<ProductOption[]>([]);
  const [brands, setBrands] = useState<ProductOption[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/categories/options'),
      api.get('/admin/brands/options'),
    ]).then(([catRes, brandRes]) => {
      setCategories(ensureApiSuccess<ProductOption[]>(catRes, '') || []);
      setBrands(ensureApiSuccess<ProductOption[]>(brandRes, '') || []);
    }).catch(() => undefined);
  }, []);

  return { categories, brands };
}
