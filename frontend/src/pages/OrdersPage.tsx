import { Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormField, FormGrid, SelectInput } from '../components/crud/CrudPage';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type OrderRow = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  payment_status: string;
  source?: string;
  total: number;
  placed_at?: string;
};

type OrderDetail = OrderRow & {
  customer_email?: string;
  customer_note?: string;
  admin_note?: string;
  subtotal: number;
  shipping: number;
  items: Array<{ product_name: string; variant_name?: string; quantity: number; unit_price: number; total: number }>;
  status_histories?: Array<{ from_status?: string; to_status: string; note?: string; created_at: string }>;
};

type ProductOption = { id: number; name: string; price: number };
type CustomerOption = { id: number; name: string; email?: string; phone?: string };
type ShippingOption = { id: number; name: string; price_amount: number };

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning', confirmed: 'default', processing: 'default', ready: 'default',
  shipped: 'success', completed: 'success', canceled: 'destructive', returned: 'destructive',
};

const statuses = ['pending', 'confirmed', 'processing', 'ready', 'shipped', 'completed', 'canceled'];

export function OrdersPage() {
  const { locale } = useI18n();
  const notify = useNotify();
  const ar = locale === 'ar';

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingOption[]>([]);

  const [form, setForm] = useState({
    customer_id: '', customer_name: '', customer_email: '', customer_phone: '',
    shipping_method_id: '', payment_method: 'cash_on_delivery', status: 'pending',
    items: [{ product_variant_id: '', quantity: 1 }] as Array<{ product_variant_id: string; quantity: number }>,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/orders', {
        params: { page, per_page: 15, search: search || undefined, status: statusFilter || undefined },
      });
      const payload = ensureApiSuccess<{ data: OrderRow[]; last_page: number; total: number }>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
      setTotal(payload?.total || 0);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل الطلبات' : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [ar, notify, page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    Promise.all([
      api.get('/admin/products/options'),
      api.get('/admin/customers/options'),
      api.get('/admin/shipping-methods/options'),
    ]).then(([pRes, cRes, sRes]) => {
      setProducts(ensureApiSuccess<ProductOption[]>(pRes, '') || []);
      setCustomers(ensureApiSuccess<CustomerOption[]>(cRes, '') || []);
      const shipping = ensureApiSuccess<Array<{ id: number; name: string; price_amount: number }>>(sRes, '') || [];
      setShippingMethods(shipping);
    }).catch(() => undefined);
  }, [createOpen]);

  const openDetail = async (id: number) => {
    try {
      const res = await api.get(`/admin/orders/${id}`);
      const data = ensureApiSuccess<OrderDetail>(res, '');
      setDetail(data);
      setNewStatus(data?.status || '');
      setStatusNote('');
      setDetailOpen(true);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل التفاصيل' : 'Failed to load details');
    }
  };

  const handleCreate = async () => {
    if (!form.customer_name || !form.items.some((i) => i.product_variant_id)) {
      notify.error(ar ? 'أكمل البيانات المطلوبة' : 'Fill required fields');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/orders', {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        customer_name: form.customer_name,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null,
        shipping_method_id: form.shipping_method_id ? Number(form.shipping_method_id) : null,
        payment_method: form.payment_method,
        status: form.status,
        items: form.items.filter((i) => i.product_variant_id).map((i) => ({
          product_variant_id: Number(i.product_variant_id),
          quantity: Number(i.quantity) || 1,
        })),
      });
      notify.success(ar ? 'تم إنشاء الطلب' : 'Order created');
      setCreateOpen(false);
      setForm({
        customer_id: '', customer_name: '', customer_email: '', customer_phone: '',
        shipping_method_id: '', payment_method: 'cash_on_delivery', status: 'pending',
        items: [{ product_variant_id: '', quantity: 1 }],
      });
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل إنشاء الطلب' : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!detail || !newStatus) return;
    setSaving(true);
    try {
      await api.put(`/admin/orders/${detail.id}/status`, { status: newStatus, note: statusNote || null });
      notify.success(ar ? 'تم تحديث الحالة' : 'Status updated');
      await openDetail(detail.id);
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحديث الحالة' : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: OrderRow) => {
    if (!window.confirm(ar ? 'حذف الطلب؟' : 'Delete order?')) return;
    try {
      await api.delete(`/admin/orders/${row.id}`);
      notify.success(ar ? 'تم الحذف' : 'Deleted');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحذف' : 'Delete failed');
    }
  };

  const onCustomerSelect = (id: string) => {
    const c = customers.find((x) => String(x.id) === id);
    setForm((f) => ({
      ...f,
      customer_id: id,
      customer_name: c?.name || f.customer_name,
      customer_email: c?.email || f.customer_email,
      customer_phone: c?.phone || f.customer_phone,
    }));
  };

  const columns = useMemo(() => [
    { key: 'order', label: ar ? 'الطلب' : 'Order' },
    { key: 'customer', label: ar ? 'العميل' : 'Customer' },
    { key: 'status', label: ar ? 'الحالة' : 'Status' },
    { key: 'source', label: ar ? 'المصدر' : 'Source' },
    { key: 'total', label: ar ? 'الإجمالي' : 'Total' },
    { key: 'actions', label: ar ? 'إجراءات' : 'Actions' },
  ], [ar]);

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'الطلبات' : 'Orders'}</h2>
          <p className="text-sm text-[#8a8da8]">{total.toLocaleString()} {ar ? 'طلب' : 'orders'}</p>
        </div>
        {hasPermission('orders.update') ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {ar ? 'طلب جديد' : 'New order'}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={ar ? 'بحث...' : 'Search...'} className="max-w-xs" />
        <SelectInput variant="filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{ar ? 'كل الحالات' : 'All statuses'}</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectInput>
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><LoadingSpinner size="md" /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد طلبات' : 'No orders'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/20 bg-white/30 text-[#6f6b7d] dark:border-white/8 dark:bg-white/5">
                <tr>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3.5 text-start text-xs font-semibold uppercase">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/15 hover:bg-white/30 dark:border-white/8">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.order_number}</p>
                      <p className="text-xs text-[#8a8da8]">{row.placed_at ? new Date(row.placed_at).toLocaleDateString() : '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{row.customer_name}</p>
                      <p className="text-xs text-[#8a8da8]">{row.customer_phone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[row.status] ?? 'default'}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.source === 'storefront' ? 'success' : 'default'}>
                        {row.source === 'storefront' ? (ar ? 'المتجر' : 'Store') : (ar ? 'لوحة' : 'Admin')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.total.toFixed(2)} SAR</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openDetail(row.id)}><Eye className="h-4 w-4" /></Button>
                        {hasPermission('orders.cancel') && ['pending', 'canceled'].includes(row.status) ? (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(row)}><Trash2 className="h-4 w-4" /></Button>
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
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{ar ? 'السابق' : 'Previous'}</Button>
          <span className="text-sm text-[#8a8da8]">{page} / {lastPage}</span>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>{ar ? 'التالي' : 'Next'}</Button>
        </div>
      ) : null}

      {createOpen ? (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-panel-enter glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold">{ar ? 'طلب جديد' : 'New Order'}</h3>
            <div className="space-y-4">
              <FormGrid>
                <FormField label={ar ? 'عميل مسجل' : 'Registered customer'}>
                  <SelectInput value={form.customer_id} onChange={(e) => onCustomerSelect(e.target.value)}>
                    <option value="">{ar ? 'ضيف' : 'Guest'}</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </SelectInput>
                </FormField>
                <FormField label={ar ? 'اسم العميل *' : 'Customer name *'}>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </FormField>
                <FormField label={ar ? 'البريد' : 'Email'}>
                  <Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
                </FormField>
                <FormField label={ar ? 'الهاتف' : 'Phone'}>
                  <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </FormField>
                <FormField label={ar ? 'طريقة الشحن' : 'Shipping'}>
                  <SelectInput value={form.shipping_method_id} onChange={(e) => setForm({ ...form, shipping_method_id: e.target.value })}>
                    <option value="">{ar ? 'بدون' : 'None'}</option>
                    {shippingMethods.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </SelectInput>
                </FormField>
                <FormField label={ar ? 'الحالة' : 'Status'}>
                  <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {statuses.filter((s) => s !== 'canceled').map((s) => <option key={s} value={s}>{s}</option>)}
                  </SelectInput>
                </FormField>
              </FormGrid>

              <div className="space-y-2">
                <p className="text-sm font-medium">{ar ? 'المنتجات *' : 'Products *'}</p>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <SelectInput value={item.product_variant_id} onChange={(e) => {
                      const items = [...form.items];
                      items[idx] = { ...items[idx], product_variant_id: e.target.value };
                      setForm({ ...form, items });
                    }}>
                      <option value="">{ar ? 'اختر منتج' : 'Select product'}</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price.toFixed(2)} SAR</option>)}
                    </SelectInput>
                    <Input type="number" min={1} className="w-24" value={item.quantity} onChange={(e) => {
                      const items = [...form.items];
                      items[idx] = { ...items[idx], quantity: Number(e.target.value) };
                      setForm({ ...form, items });
                    }} />
                    {form.items.length > 1 ? (
                      <Button variant="destructive" size="sm" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>×</Button>
                    ) : null}
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { product_variant_id: '', quantity: 1 }] })}>
                  {ar ? '+ منتج' : '+ Product'}
                </Button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {ar ? 'إنشاء' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && detail ? (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-panel-enter glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <h3 className="mb-1 text-lg font-bold">{detail.order_number}</h3>
            <p className="mb-4 text-sm text-[#8a8da8]">{detail.customer_name} · {detail.total.toFixed(2)} SAR</p>

            <div className="mb-4 space-y-2">
              {detail.items?.map((item, i) => (
                <div key={i} className="flex justify-between rounded-xl bg-white/30 px-3 py-2 text-sm dark:bg-white/5">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{item.total.toFixed(2)} SAR</span>
                </div>
              ))}
            </div>

            {hasPermission('orders.change_status') ? (
              <div className="mb-4 space-y-2 rounded-xl border border-white/20 p-3">
                <p className="text-sm font-medium">{ar ? 'تحديث الحالة' : 'Update status'}</p>
                <div className="flex flex-wrap gap-2">
                  <SelectInput value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </SelectInput>
                  <Input placeholder={ar ? 'ملاحظة' : 'Note'} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="flex-1" />
                  <Button onClick={handleStatusUpdate} disabled={saving}>{ar ? 'تحديث' : 'Update'}</Button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>{ar ? 'إغلاق' : 'Close'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
