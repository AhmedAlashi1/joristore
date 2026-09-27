import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Fragment } from 'react';
import { useEffect, useState } from 'react';
import { FormField } from '../components/crud/CrudPage';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { mediaUrl } from '../lib/media';
import type { PaymentMethodConfig } from '../lib/payment-methods';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

export function PaymentMethodsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/settings/payment-methods')
      .then((res) => setMethods(ensureApiSuccess<PaymentMethodConfig[]>(res, '') || []))
      .catch(() => notify.error(ar ? 'فشل التحميل' : 'Load failed'))
      .finally(() => setLoading(false));
  }, [ar, notify]);

  const patch = (id: string, data: Partial<PaymentMethodConfig>) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/settings/payment-methods', { methods });
      setMethods(ensureApiSuccess<PaymentMethodConfig[]>(res, '') || methods);
      notify.success(ar ? 'تم الحفظ' : 'Saved');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7367f0]" /></div>;
  }

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'طرق الدفع' : 'Payment methods'}</h2>
          <p className="text-sm text-[#8a8da8]">
            {ar ? 'فعّل أو عطّل الطرق وعدّل QR والتعليمات' : 'Enable/disable methods and edit QR & instructions'}
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {ar ? 'حفظ الكل' : 'Save all'}
        </Button>
      </div>

      <Card className="glass-strong overflow-hidden border-0">
        <CardHeader className="border-b border-[#ebe9f1] pb-3">
          <CardTitle className="text-base">{ar ? 'جدول الطرق' : 'Methods table'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#ebe9f1] bg-[#f8f7fa] text-start text-xs text-[#8a8da8]">
                  <th className="px-4 py-3 font-semibold">{ar ? 'مفعّل' : 'Active'}</th>
                  <th className="px-4 py-3 font-semibold">{ar ? 'الطريقة' : 'Method'}</th>
                  <th className="px-4 py-3 font-semibold">{ar ? 'الاسم (ع)' : 'Label AR'}</th>
                  <th className="px-4 py-3 font-semibold">{ar ? 'الاسم (EN)' : 'Label EN'}</th>
                  <th className="px-4 py-3 font-semibold">QR</th>
                  <th className="px-4 py-3 font-semibold">{ar ? 'تفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => {
                  const open = expandedId === method.id;
                  return (
                    <Fragment key={method.id}>
                      <tr className="border-b border-[#ebe9f1] align-middle">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={(e) => patch(method.id, { enabled: e.target.checked })}
                            aria-label={method.id}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{method.id}</td>
                        <td className="px-4 py-3">
                          <Input
                            value={method.label_ar}
                            onChange={(e) => patch(method.id, { label_ar: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            dir="ltr"
                            value={method.label_en}
                            onChange={(e) => patch(method.id, { label_en: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {method.qr_image ? (
                            <img src={mediaUrl(method.qr_image)} alt="" className="h-10 w-10 rounded-lg border object-cover" />
                          ) : (
                            <span className="text-xs text-[#8a8da8]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setExpandedId(open ? null : method.id)}
                          >
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </Button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-[#faf9fc]">
                          <td colSpan={6} className="space-y-4 px-4 py-4">
                            {method.id === 'wallet' ? (
                              <p className="text-sm text-[#8a8da8]">
                                {ar ? 'خصم من محفظة العميل — بدون QR.' : 'Debited from customer wallet — no QR.'}
                              </p>
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                <FormField label={ar ? 'تعليمات (عربي)' : 'Instructions (AR)'}>
                                  <textarea
                                    className="glass-input min-h-[72px] w-full rounded-xl px-3 py-2 text-sm"
                                    value={method.instructions_ar}
                                    onChange={(e) => patch(method.id, { instructions_ar: e.target.value })}
                                  />
                                </FormField>
                                <FormField label={ar ? 'تعليمات (EN)' : 'Instructions (EN)'}>
                                  <textarea
                                    className="glass-input min-h-[72px] w-full rounded-xl px-3 py-2 text-sm"
                                    dir="ltr"
                                    value={method.instructions_en}
                                    onChange={(e) => patch(method.id, { instructions_en: e.target.value })}
                                  />
                                </FormField>
                                {method.id !== 'cash_on_delivery' ? (
                                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                                    <input
                                      type="checkbox"
                                      checked={method.requires_receipt}
                                      onChange={(e) => patch(method.id, { requires_receipt: e.target.checked })}
                                    />
                                    {ar ? 'يتطلب رفع إيصال' : 'Requires receipt upload'}
                                  </label>
                                ) : null}
                                {method.id !== 'cash_on_delivery' && method.id !== 'wallet' ? (
                                  <div className="md:col-span-2">
                                    <ImageUploadField
                                      label={ar ? 'QR للدفع' : 'Payment QR'}
                                      folder="payment-qr"
                                      value={method.qr_image || ''}
                                      onChange={(path) => patch(method.id, { qr_image: path || null })}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
