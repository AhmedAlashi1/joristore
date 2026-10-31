import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SelectInput } from '../components/crud/CrudPage';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type PartnerOpt = { id: number; name: string };
type PayoutRow = {
  id: number;
  partner_name?: string;
  amount: number;
  receipt_url?: string | null;
  admin_note?: string | null;
  paid_at?: string;
};

export function PartnerPayoutsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const canPay = hasPermission('partner_payouts.manage');
  const [partners, setPartners] = useState<PartnerOpt[]>([]);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptPath, setReceiptPath] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [pRes, listRes] = await Promise.all([
      api.get('/admin/partners/options'),
      api.get('/admin/partner-payouts', { params: { per_page: 30 } }),
    ]);
    setPartners(pRes.data?.data ?? []);
    setRows(listRes.data?.data?.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay) return;
    setMsg('');
    setLoading(true);
    try {
      await api.post('/admin/partner-payouts', {
        partner_id: Number(partnerId),
        amount: Number(amount),
        receipt_path: receiptPath || null,
        admin_note: note || null,
      });
      setPartnerId('');
      setAmount('');
      setReceiptPath('');
      setNote('');
      setMsg(ar ? 'تم تسجيل سند الصرف' : 'Payout recorded');
      await load();
    } catch (err: unknown) {
      setMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{ar ? 'سندات صرف الشركاء' : 'Partner payouts'}</h1>
        <p className="text-sm text-slate-500 mt-1">{ar ? 'ارفع وصل التحويل وخصم من الأرباح المعلّقة' : 'Upload transfer receipt and reduce pending balance'}</p>
      </div>

      {canPay ? (
        <form onSubmit={(e) => void submit(e)} className="rounded-xl border p-4 space-y-3 max-w-lg">
          <label className="block text-sm">
            {ar ? 'الشريك' : 'Partner'}
            <SelectInput value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="">{ar ? 'اختر…' : 'Select…'}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SelectInput>
          </label>
          <label className="block text-sm">
            {ar ? 'المبلغ' : 'Amount'}
            <Input type="number" step="0.01" min="0" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <ImageUploadField
            label={ar ? 'وصل التحويل' : 'Transfer receipt'}
            folder="payment-receipts"
            value={receiptPath}
            onChange={setReceiptPath}
          />
          <label className="block text-sm">
            {ar ? 'ملاحظة' : 'Note'}
            <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {msg ? <p className="text-sm">{msg}</p> : null}
          <Button type="submit" disabled={loading || !partnerId || !amount}>{ar ? 'تسجيل الصرف' : 'Record payout'}</Button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? 'الشريك' : 'Partner'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'المبلغ' : 'Amount'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'التاريخ' : 'Date'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'وصل' : 'Receipt'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.partner_name}</td>
                <td className="px-3 py-2">{r.amount} ₪</td>
                <td className="px-3 py-2">{r.paid_at ? new Date(r.paid_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  {r.receipt_url ? <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{ar ? 'عرض' : 'View'}</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
