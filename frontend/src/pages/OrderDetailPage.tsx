import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { SelectInput } from '../components/crud/CrudPage';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import {
  ORDER_STATUSES,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  quickStatusActions,
  statusVariant,
} from '../lib/order-status';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type OrderDetail = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_note?: string;
  admin_note?: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  source?: string;
  total: number;
  subtotal: number;
  shipping: number;
  placed_at?: string;
  items: Array<{
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  addresses?: Array<{
    type?: string;
    full_name: string;
    phone?: string;
    city: string;
    area?: string;
    street?: string;
    building?: string;
  }>;
  payments?: Array<{
    id: number;
    payment_method: string;
    status: string;
    amount: number;
    receipt_url?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  status_histories?: Array<{
    from_status?: string | null;
    to_status: string;
    note?: string | null;
    created_at: string;
  }>;
};

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}`);
      const data = ensureApiSuccess<OrderDetail>(res, '');
      setDetail(data);
      setAdminNote(data?.admin_note ?? '');
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل الطلب' : 'Failed to load order');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  }, [ar, id, navigate, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (status: string) => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/admin/orders/${detail.id}/status`, { status, note: statusNote || null });
      notify.success(ar ? 'تم تحديث الحالة' : 'Status updated');
      setStatusNote('');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل التحديث' : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markPaymentPaid = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/admin/orders/${detail.id}`, { payment_status: 'paid' });
      notify.success(ar ? 'تم تأكيد الدفع' : 'Payment marked paid');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تأكيد الدفع' : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const saveAdminNote = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/admin/orders/${detail.id}`, { admin_note: adminNote });
      notify.success(ar ? 'تم حفظ الملاحظة' : 'Note saved');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!detail) return null;

  const shippingAddress = detail.addresses?.find((a) => a.type === 'shipping') ?? detail.addresses?.[0];
  const payment = detail.payments?.[0];
  const quick = quickStatusActions(detail.status);

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/orders" className="glass rounded-xl p-2">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{detail.order_number}</h2>
          <p className="text-sm text-[#8a8da8]">
            {detail.customer_name}
            {detail.placed_at ? ` · ${new Date(detail.placed_at).toLocaleString(ar ? 'ar' : 'en')}` : ''}
          </p>
        </div>
        <Badge variant={statusVariant[detail.status] ?? 'default'}>{orderStatusLabel(detail.status, ar)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-strong space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#8a8da8]">{ar ? 'العميل' : 'Customer'}</h3>
          <p className="font-medium">{detail.customer_name}</p>
          <p className="text-sm" dir="ltr">{detail.customer_phone ?? '—'}</p>
          <p className="text-sm">{detail.customer_email ?? '—'}</p>
          {detail.customer_note ? (
            <p className="rounded-xl bg-white/30 p-3 text-sm dark:bg-white/5">{detail.customer_note}</p>
          ) : null}
        </section>

        <section className="glass-strong space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#8a8da8]">{ar ? 'الدفع والشحن' : 'Payment & shipping'}</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">{paymentMethodLabel(payment?.payment_method ?? 'cash_on_delivery', ar)}</Badge>
            <Badge variant={detail.payment_status === 'paid' ? 'success' : 'warning'}>
              {paymentStatusLabel(detail.payment_status, ar)}
            </Badge>
            <Badge variant="default">{detail.shipping_status}</Badge>
          </div>
          <p className="text-lg font-bold">{detail.total.toFixed(2)} SAR</p>
          {payment?.receipt_url ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{ar ? 'إيصال الدفع' : 'Payment receipt'}</p>
              <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/20">
                <img src={payment.receipt_url} alt="" className="max-h-64 w-full object-contain bg-white/20" />
              </a>
              {hasPermission('orders.update') && detail.payment_status !== 'paid' ? (
                <Button onClick={() => void markPaymentPaid()} disabled={saving}>
                  {ar ? 'تأكيد استلام الدفع' : 'Confirm payment received'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {shippingAddress ? (
        <section className="glass-strong rounded-2xl p-5">
          <h3 className="mb-2 text-sm font-bold text-[#8a8da8]">{ar ? 'عنوان التوصيل' : 'Shipping address'}</h3>
          <p className="text-sm">
            {shippingAddress.full_name} · {shippingAddress.phone}
            <br />
            {[shippingAddress.city, shippingAddress.area, shippingAddress.street, shippingAddress.building].filter(Boolean).join(' · ')}
          </p>
        </section>
      ) : null}

      <section className="glass-strong rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-bold text-[#8a8da8]">{ar ? 'المنتجات' : 'Items'}</h3>
        <div className="space-y-2">
          {detail.items.map((item, i) => (
            <div key={i} className="flex justify-between rounded-xl bg-white/30 px-3 py-2 text-sm dark:bg-white/5">
              <span>
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ''} × {item.quantity}
              </span>
              <span className="font-semibold">{item.total.toFixed(2)} SAR</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-white/20 pt-3 text-sm">
          <div className="flex justify-between"><span>{ar ? 'المجموع' : 'Subtotal'}</span><span>{detail.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>{ar ? 'الشحن' : 'Shipping'}</span><span>{detail.shipping.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold"><span>{ar ? 'الإجمالي' : 'Total'}</span><span>{detail.total.toFixed(2)} SAR</span></div>
        </div>
      </section>

      {hasPermission('orders.change_status') ? (
        <section className="glass-strong space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#8a8da8]">{ar ? 'تحديث الحالة' : 'Update status'}</h3>
          {quick.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quick.map((s) => (
                <Button key={s} variant="secondary" size="sm" disabled={saving} onClick={() => void updateStatus(s)}>
                  {orderStatusLabel(s, ar)}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SelectInput value={detail.status} onChange={(e) => void updateStatus(e.target.value)} disabled={saving}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{orderStatusLabel(s, ar)}</option>
              ))}
            </SelectInput>
            <Input
              placeholder={ar ? 'ملاحظة (اختياري)' : 'Note (optional)'}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="min-w-[200px] flex-1"
            />
          </div>
        </section>
      ) : null}

      <section className="glass-strong space-y-3 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#8a8da8]">{ar ? 'ملاحظة إدارية' : 'Admin note'}</h3>
        <textarea
          className="w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm outline-none dark:bg-white/5"
          rows={3}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
        {hasPermission('orders.update') ? (
          <Button onClick={() => void saveAdminNote()} disabled={saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {ar ? 'حفظ' : 'Save'}
          </Button>
        ) : null}
      </section>

      {detail.status_histories && detail.status_histories.length > 0 ? (
        <section className="glass-strong rounded-2xl p-5">
          <h3 className="mb-3 text-sm font-bold text-[#8a8da8]">{ar ? 'سجل الحالات' : 'Status history'}</h3>
          <ul className="space-y-2 text-sm">
            {[...detail.status_histories].reverse().map((h, i) => (
              <li key={i} className="rounded-xl bg-white/30 px-3 py-2 dark:bg-white/5">
                <span className="font-medium">{orderStatusLabel(h.to_status, ar)}</span>
                <span className="text-[#8a8da8]"> · {new Date(h.created_at).toLocaleString(ar ? 'ar' : 'en')}</span>
                {h.note ? <p className="text-[#8a8da8]">{h.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
