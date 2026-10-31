import { Check, Loader2, Upload, User, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { formatPrice } from '../lib/format-price';
import type { PaymentMethodConfig } from '../lib/payment-methods';
import { mediaUrl, uploadMedia } from '../lib/media';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type Row = {
  id: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  type: string;
  amount: number;
  status: string;
  payment_method?: string | null;
  transfer_reference?: string | null;
  account_holder_name?: string | null;
  receipt_path?: string | null;
  receipt_url?: string | null;
  customer_note?: string | null;
  created_at?: string;
};

function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  if (!value || value === '—') return null;
  return (
    <div className="rounded-lg bg-white/50 px-3 py-2 dark:bg-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8da8]">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${ltr ? 'dir-ltr text-start' : ''}`} dir={ltr ? 'ltr' : undefined}>{value}</p>
    </div>
  );
}

export function WalletRequestsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [rows, setRows] = useState<Row[]>([]);
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminReceiptPath, setAdminReceiptPath] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/wallet-requests', { params: { status: 'pending', per_page: 50 } }),
      api.get('/admin/settings/payment-methods'),
    ])
      .then(([reqRes, payRes]) => {
        const paginator = ensureApiSuccess<{ data: Row[] }>(reqRes, '');
        setRows(Array.isArray(paginator?.data) ? paginator.data : []);
        setMethods(ensureApiSuccess<PaymentMethodConfig[]>(payRes, '') || []);
      })
      .catch(() => notify.error(ar ? 'فشل التحميل' : 'Load failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [ar, notify]);

  const payLabel = (id?: string | null) => {
    if (!id) return '—';
    const m = methods.find((x) => x.id === id);
    if (m) return ar ? m.label_ar : m.label_en;
    return id;
  };

  const openApprove = (id: number) => {
    setApproveId(id);
    setAdminNote('');
    setAdminReceiptPath(null);
  };

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const body = action === 'approve'
        ? { admin_note: adminNote || undefined, admin_transfer_receipt_path: adminReceiptPath ?? undefined }
        : { admin_note: adminNote || undefined };
      await api.post(`/admin/wallet-requests/${id}/${action}`, body);
      notify.success(
        action === 'approve'
          ? (ar ? 'تمت الموافقة — وصل إشعار للعميل مع صورة الإشعار إن وُجدت' : 'Approved — customer notified with notice image if uploaded')
          : (ar ? 'تم الرفض' : 'Rejected'),
      );
      setApproveId(null);
      setAdminNote('');
      setAdminReceiptPath(null);
      load();
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل' : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const onAdminReceipt = async (file: File | null) => {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const uploaded = await uploadMedia(file, 'payment-receipts');
      setAdminReceiptPath(uploaded.path);
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل رفع الصورة' : 'Upload failed');
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-[#7367f0]" />
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'طلبات المحفظة' : 'Wallet requests'}</h2>
          <p className="text-sm text-[#8a8da8]">{ar ? 'راجع التفاصيل، ارفق إشعار التحويل، ثم وافق ليصل للعميل في التطبيق' : 'Review details, attach transfer notice, approve to notify the customer app'}</p>
        </div>
      </div>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle className="text-base">{ar ? 'قيد المراجعة' : 'Pending'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#7367f0]" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد طلبات' : 'No pending requests'}</p>
          ) : (
            <ul className="divide-y divide-[#ebe9f1]">
              {rows.map((r) => {
                const isTopUp = r.type === 'top_up';
                return (
                  <li key={r.id} className="space-y-4 px-4 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isTopUp ? 'success' : 'warning'}>
                            {isTopUp ? (ar ? 'شحن' : 'Top up') : (ar ? 'سحب' : 'Withdraw')}
                          </Badge>
                          <span className="text-lg font-black text-[#7367f0]">{formatPrice(r.amount)}</span>
                          <span className="text-xs text-[#8a8da8]">#{r.id}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-[#8a8da8]" />
                          <span className="font-bold">{r.customer_name ?? '—'}</span>
                          {r.customer_phone ? <span className="text-[#8a8da8]" dir="ltr">{r.customer_phone}</span> : null}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Detail label={ar ? 'طريقة الدفع' : 'Payment method'} value={payLabel(r.payment_method)} />
                          <Detail label={ar ? 'رقم التحويل / الحساب' : 'Transfer / account'} value={r.transfer_reference ?? '—'} ltr />
                          <Detail label={ar ? 'اسم صاحب الحساب' : 'Account holder'} value={r.account_holder_name ?? '—'} />
                          <Detail
                            label={ar ? 'تاريخ الطلب' : 'Requested at'}
                            value={r.created_at ? new Date(r.created_at).toLocaleString(ar ? 'ar' : 'en') : '—'}
                          />
                        </div>

                        {r.customer_note ? (
                          <p className="rounded-xl border border-dashed border-[#ebe9f1] bg-white/40 px-3 py-2 text-xs dark:bg-white/5">
                            <span className="font-semibold">{ar ? 'ملاحظة العميل: ' : 'Customer note: '}</span>
                            {r.customer_note}
                          </p>
                        ) : null}

                        {r.receipt_url || r.receipt_path ? (
                          <div className="max-w-sm">
                            <p className="mb-1 text-xs font-semibold text-[#8a8da8]">{ar ? 'إيصال العميل' : 'Customer receipt'}</p>
                            <a href={r.receipt_url ?? mediaUrl(r.receipt_path)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border shadow-sm">
                              <img src={r.receipt_url ?? mediaUrl(r.receipt_path)} alt="" className="max-h-48 w-full object-contain bg-white" />
                            </a>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <Button size="sm" disabled={busyId === r.id} onClick={() => openApprove(r.id)}>
                          {busyId === r.id && approveId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          <span className="ms-1 hidden sm:inline">{ar ? 'موافقة' : 'Approve'}</span>
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => { setAdminNote(''); void act(r.id, 'reject'); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {approveId === r.id ? (
                      <div className="space-y-3 rounded-2xl border border-[#7367f0]/35 bg-[#7367f0]/8 p-4">
                        <p className="text-sm font-bold">{ar ? 'تأكيد الموافقة وإرسال إشعار للعميل' : 'Confirm approval & notify customer'}</p>
                        <p className="text-xs text-[#8a8da8]">
                          {ar
                            ? `سيتلقى ${r.customer_name} إشعاراً بالمبلغ ${formatPrice(r.amount)} مع صورة إشعار التحويل إن رفعتها.`
                            : `${r.customer_name} will get a notification for ${formatPrice(r.amount)} with your notice image if uploaded.`}
                        </p>
                        <Input
                          placeholder={ar ? 'ملاحظة تظهر في الإشعار (اختياري)' : 'Note shown in notification (optional)'}
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <div className="space-y-2">
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#7367f0]/50 bg-white/60 px-3 py-3 text-xs font-semibold dark:bg-white/5">
                            {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {adminReceiptPath ? (ar ? 'تم رفع صورة إشعار التحويل ✓' : 'Transfer notice image uploaded ✓') : (ar ? 'رفع صورة إشعار التحويل للعميل' : 'Upload transfer notice for customer')}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingReceipt} onChange={(e) => void onAdminReceipt(e.target.files?.[0] ?? null)} />
                          </label>
                          {adminReceiptPath ? (
                            <img src={mediaUrl(adminReceiptPath)} alt="" className="max-h-40 w-full rounded-xl border object-contain bg-white" />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={busyId === r.id || uploadingReceipt} onClick={() => void act(r.id, 'approve')}>
                            {ar ? 'موافقة وإرسال للعميل' : 'Approve & send to customer'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setApproveId(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
