import { useEffect, useState } from 'react';
import { partnerApi } from '../../lib/partner-api';
import { useI18n } from '../../providers/i18n-provider';

type Stats = {
  pending_commission: number;
  paid_commission: number;
  orders_count: number;
};

export function PartnerDashboardPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    partnerApi.get('/store/partner/dashboard').then((res) => setStats(res.data?.data ?? null)).catch(() => setStats(null));
  }, []);

  const cards: { label: string; value: number | undefined; money: boolean }[] = [
    { label: ar ? 'أرباح معلّقة' : 'Pending earnings', value: stats?.pending_commission, money: true },
    { label: ar ? 'أرباح مدفوعة' : 'Paid earnings', value: stats?.paid_commission, money: true },
    { label: ar ? 'طلبات بالكوبون' : 'Coupon orders', value: stats?.orders_count, money: false },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{ar ? 'لوحة الشريك' : 'Partner dashboard'}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="text-2xl font-semibold mt-1">
              {c.value ?? '—'}{c.money && c.value != null ? ' ₪' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
