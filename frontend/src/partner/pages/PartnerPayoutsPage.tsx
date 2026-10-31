import { useEffect, useState } from 'react';
import { partnerApi } from '../../lib/partner-api';
import { useI18n } from '../../providers/i18n-provider';

type Row = {
  id: number;
  amount: number;
  receipt_url?: string | null;
  admin_note?: string | null;
  paid_at?: string;
};

export function PartnerPayoutsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    partnerApi.get('/store/partner/payouts', { params: { per_page: 50 } }).then((res) => {
      setRows(res.data?.data?.data ?? []);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{ar ? 'سندات الصرف' : 'Payout receipts'}</h1>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <p className="font-semibold">{r.amount} ₪</p>
              <p className="text-xs text-slate-500">{r.paid_at ? new Date(r.paid_at).toLocaleString() : ''}</p>
              {r.admin_note ? <p className="text-sm mt-1">{r.admin_note}</p> : null}
            </div>
            {r.receipt_url ? (
              <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
                {ar ? 'عرض وصل التحويل' : 'View transfer receipt'}
              </a>
            ) : null}
          </div>
        ))}
        {!rows.length ? <p className="text-slate-500">{ar ? 'لا توجد سندات بعد' : 'No payouts yet'}</p> : null}
      </div>
    </div>
  );
}
