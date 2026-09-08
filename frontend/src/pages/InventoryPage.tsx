import { Loader2, PackagePlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FormField, SelectInput } from '../components/crud/CrudPage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type InventoryRow = {
  id: number;
  product_name: string;
  sku?: string;
  quantity: number;
  reserved_quantity: number;
  available: number;
  low_stock_threshold: number;
  location?: string;
};

type ProductOption = { id: number; name: string };

export function InventoryPage() {
  const { locale } = useI18n();
  const notify = useNotify();
  const ar = locale === 'ar';

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [adjustForm, setAdjustForm] = useState({ variant_id: '', quantity: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/inventory', {
        params: { page, per_page: 15, search: search || undefined, low_stock: lowStockOnly || undefined },
      });
      const payload = ensureApiSuccess<{ data: InventoryRow[]; last_page: number }>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل المخزون' : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [ar, lowStockOnly, notify, page, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!adjustOpen) return;
    api.get('/admin/products/options').then((res) => {
      setProducts(ensureApiSuccess<ProductOption[]>(res, '') || []);
    }).catch(() => undefined);
  }, [adjustOpen]);

  const handleAdjust = async () => {
    if (!adjustForm.variant_id || !adjustForm.quantity) return;
    setSaving(true);
    try {
      await api.post('/admin/inventory/adjust', {
        variant_id: Number(adjustForm.variant_id),
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason || undefined,
      });
      notify.success(ar ? 'تم تعديل المخزون' : 'Inventory adjusted');
      setAdjustOpen(false);
      setAdjustForm({ variant_id: '', quantity: '', reason: '' });
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل التعديل' : 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'المخزون' : 'Inventory'}</h2>
          <p className="text-sm text-[#8a8da8]">{ar ? 'متابعة الكميات والتعديلات' : 'Track stock levels and adjustments'}</p>
        </div>
        {hasPermission('inventory.adjust') ? (
          <Button onClick={() => setAdjustOpen(true)}>
            <PackagePlus className="me-2 h-4 w-4" />
            {ar ? 'تعديل المخزون' : 'Adjust stock'}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={ar ? 'بحث...' : 'Search...'} className="max-w-xs" />
        <label className="flex items-center gap-2 rounded-xl bg-white/30 px-3 py-2 text-sm dark:bg-white/5">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} className="accent-[#7367f0]" />
          {ar ? 'مخزون منخفض فقط' : 'Low stock only'}
        </label>
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><LoadingSpinner size="md" /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد سجلات' : 'No records'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/20 bg-white/30 dark:border-white/8 dark:bg-white/5">
                <tr>
                  {[ar ? 'المنتج' : 'Product', ar ? 'SKU' : 'SKU', ar ? 'الكمية' : 'Qty', ar ? 'محجوز' : 'Reserved', ar ? 'متاح' : 'Available', ar ? 'حد التنبيه' : 'Threshold'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-start text-xs font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/15 hover:bg-white/30 dark:border-white/8">
                    <td className="px-4 py-3 font-medium">{row.product_name}</td>
                    <td className="px-4 py-3 text-[#8a8da8]">{row.sku ?? '—'}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.reserved_quantity}</td>
                    <td className={`px-4 py-3 font-semibold ${row.available <= row.low_stock_threshold ? 'text-[#ff9f43]' : ''}`}>{row.available}</td>
                    <td className="px-4 py-3">{row.low_stock_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 ? (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{ar ? 'السابق' : 'Previous'}</Button>
          <span className="text-sm text-[#8a8da8]">{page} / {lastPage}</span>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>{ar ? 'التالي' : 'Next'}</Button>
        </div>
      ) : null}

      {adjustOpen ? (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-panel-enter glass-strong w-full max-w-md rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold">{ar ? 'تعديل المخزون' : 'Adjust Inventory'}</h3>
            <div className="space-y-4">
              <FormField label={ar ? 'المنتج *' : 'Product *'}>
                <SelectInput value={adjustForm.variant_id} onChange={(e) => setAdjustForm({ ...adjustForm, variant_id: e.target.value })}>
                  <option value="">{ar ? 'اختر' : 'Select'}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label={ar ? 'الكمية (+/-) *' : 'Quantity (+/-) *'}>
                <Input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} placeholder={ar ? 'مثال: 10 أو -5' : 'e.g. 10 or -5'} />
              </FormField>
              <FormField label={ar ? 'السبب' : 'Reason'}>
                <Input value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleAdjust} disabled={saving}>
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {ar ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
