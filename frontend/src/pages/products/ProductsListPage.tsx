import { Copy, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { Input } from '../../components/ui/input';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { hasPermission } from '../../lib/auth';
import { formatPrice } from '../../lib/format-price';
import { mediaUrl } from '../../lib/media';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';
import { ProductPageHeader } from './ProductPageHeader';
import { type ProductRecord, statusVariant } from './product-shared';

type Paginated = {
  data: ProductRecord[];
  current_page: number;
  last_page: number;
  total: number;
};

export function ProductsListPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const canCreate = hasPermission('products.create');
  const canUpdate = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');
  const canDuplicate = hasPermission('products.create');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products', {
        params: { page, per_page: 15, search: search || undefined },
      });
      const payload = ensureApiSuccess<Paginated>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
      setTotal(payload?.total || 0);
      setSelected(new Set());
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل المنتجات' : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [ar, notify, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(ar ? `حذف ${ids.length} منتج؟` : `Delete ${ids.length} products?`)) return;

    setBusy(true);
    try {
      const res = await api.post('/admin/products/bulk-delete', { ids });
      const data = ensureApiSuccess<{ deleted?: number }>(res, '');
      notify.success(ar ? `تم حذف ${data?.deleted ?? ids.length} منتج` : `Deleted ${data?.deleted ?? ids.length} products`);
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    const typed = window.prompt(
      ar
        ? `⚠️ حذف كل المنتجات (${total}). اكتب: DELETE_ALL_PRODUCTS`
        : `⚠️ Delete ALL ${total} products. Type: DELETE_ALL_PRODUCTS`,
    );
    if (typed !== 'DELETE_ALL_PRODUCTS') return;

    setBusy(true);
    try {
      const res = await api.post('/admin/products/delete-all', { confirm: 'DELETE_ALL_PRODUCTS' });
      const data = ensureApiSuccess<{ deleted?: number }>(res, '');
      notify.success(ar ? `تم حذف ${data?.deleted ?? total} منتج` : `Deleted ${data?.deleted ?? total} products`);
      setPage(1);
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (row: ProductRecord) => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/products/${row.id}/duplicate`);
      const created = ensureApiSuccess<ProductRecord>(res, '');
      notify.success(ar ? 'تم النسخ — عدّل اللون والصورة' : 'Duplicated — update color and images');
      navigate(`/admin/products/${created.id}/edit`);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل النسخ' : 'Duplicate failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (row: ProductRecord) => {
    if (!window.confirm(ar ? `حذف «${row.name}»؟` : `Delete "${row.name}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/products/${row.id}`);
      notify.success(ar ? 'تم الحذف' : 'Deleted');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <ProductPageHeader
        title={ar ? 'المنتجات' : 'Products'}
        subtitle={`${total.toLocaleString()} ${ar ? 'منتج' : 'products'}`}
        backTo="/admin/dashboard"
        backLabel={ar ? 'لوحة التحكم' : 'Dashboard'}
        actions={canCreate ? (
          <Link to="/admin/products/new" className={cn(buttonVariants())}>
            <Plus className="me-2 h-4 w-4" />
            {ar ? 'منتج جديد' : 'New product'}
          </Link>
        ) : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={ar ? 'بحث بالاسم...' : 'Search by name...'}
          className="max-w-xs"
        />
        {canDelete && selected.size > 0 ? (
          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void bulkDelete()}>
            {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Trash2 className="me-2 h-4 w-4" />}
            {ar ? `حذف المحدد (${selected.size})` : `Delete selected (${selected.size})`}
          </Button>
        ) : null}
        {canDelete && total > 0 ? (
          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void deleteAll()}>
            {ar ? 'حذف الكل' : 'Delete all'}
          </Button>
        ) : null}
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8]">
            {ar ? 'لا منتجات — ابدأ بإضافة منتج جديد' : 'No products — add your first product'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/20 bg-white/30 text-[#6f6b7d] dark:border-white/8 dark:bg-white/5">
                <tr>
                  {canDelete ? (
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        aria-label={ar ? 'تحديد الصفحة' : 'Select page'}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-start">{ar ? 'الصورة' : 'Image'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'المنتج' : 'Product'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'التصنيف' : 'Category'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'السعر' : 'Price'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'المخزون' : 'Stock'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-end">{ar ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/15 dark:border-white/8">
                    {canDelete ? (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {row.image
                        ? <img src={mediaUrl(row.image)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#7367f0]/10 text-sm font-bold text-[#7367f0]">{row.name.charAt(0)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${row.id}`} className="font-medium text-[#7367f0] hover:underline">
                        {row.name}
                      </Link>
                      <p className="text-xs text-[#8a8da8]">{row.sku ?? row.slug}</p>
                    </td>
                    <td className="px-4 py-3">{row.category_name ?? '—'}</td>
                    <td className="px-4 py-3">{formatPrice(row.price)}</td>
                    <td className="px-4 py-3">
                      <span className={row.quantity <= 5 ? 'font-semibold text-[#ff9f43]' : ''}>{row.quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[row.status] ?? 'default'}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/admin/products/${row.id}`}
                          title={ar ? 'عرض' : 'View'}
                          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canUpdate ? (
                          <Link
                            to={`/admin/products/${row.id}/edit`}
                            title={ar ? 'تعديل' : 'Edit'}
                            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        ) : null}
                        {canDuplicate ? (
                          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void duplicate(row)} title={ar ? 'نسخ' : 'Duplicate'}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void deleteOne(row)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{ar ? 'السابق' : 'Prev'}</Button>
          <span className="text-sm text-[#8a8da8]">{page} / {lastPage}</span>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>{ar ? 'التالي' : 'Next'}</Button>
        </div>
      ) : null}
    </div>
  );
}
