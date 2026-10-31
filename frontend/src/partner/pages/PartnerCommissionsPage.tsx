import { useEffect, useState } from 'react';
import { partnerApi } from '../../lib/partner-api';
import { useI18n } from '../../providers/i18n-provider';

type Row = {
  id: number;
  order_number?: string;
  coupon_code?: string;
  order_subtotal: number;
  commission_amount: number;
  status: string;
  created_at?: string;
};

export function PartnerCommissionsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    partnerApi.get('/store/partner/commissions', { params: { per_page: 50 } }).then((res) => {
      setRows(res.data?.data?.data ?? []);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{ar ? 'الطلبات والأرباح' : 'Orders & commissions'}</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? 'الطلب' : 'Order'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'الكوبون' : 'Coupon'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'أساس العمولة' : 'Base'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'ربحك' : 'Commission'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2 font-mono">{r.order_number ?? r.id}</td>
                <td className="px-3 py-2">{r.coupon_code ?? '—'}</td>
                <td className="px-3 py-2">{r.order_subtotal} ₪</td>
                <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-400">{r.commission_amount} ₪</td>
                <td className="px-3 py-2">{r.status === 'pending' ? (ar ? 'معلّق' : 'Pending') : (ar ? 'مدفوع' : 'Paid')}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">{ar ? 'لا توجد بيانات بعد' : 'No data yet'}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
