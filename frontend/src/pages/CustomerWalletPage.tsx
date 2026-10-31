import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Loader2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { formatPrice } from '../lib/format-price';
import { cn } from '../lib/cn';
import { useI18n } from '../providers/i18n-provider';

type WalletPayload = {
  customer_name: string;
  balance: number;
  pending_top_up: number;
  pending_withdrawal: number;
  transactions: Array<{
    id: number;
    type: string;
    amount: number;
    balance_after: number;
    note?: string | null;
    created_at?: string;
  }>;
  requests: Array<{
    id: number;
    type: string;
    amount: number;
    status: string;
    payment_method?: string | null;
    created_at?: string;
  }>;
};

export function CustomerWalletPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [data, setData] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/customers/${id}/wallet`);
      setData(ensureApiSuccess<WalletPayload>(res, ''));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/customers" className="glass rounded-xl p-2">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'محفظة العميل' : 'Customer wallet'}</h2>
          {data ? <p className="text-sm text-[#8a8da8]">{data.customer_name}</p> : null}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#7367f0]" /></div>
      ) : data ? (
        <>
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7367f0]/15 text-[#7367f0]">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-xs text-[#8a8da8]">{ar ? 'الرصيد الحالي' : 'Current balance'}</p>
                <p className="text-3xl font-black text-[#7367f0]">{formatPrice(data.balance)}</p>
              </div>
            </div>
            {(data.pending_top_up > 0 || data.pending_withdrawal > 0) ? (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {data.pending_top_up > 0 ? (
                  <p className="rounded-xl bg-amber-500/10 px-3 py-2">{ar ? 'شحن قيد المراجعة:' : 'Pending top-up:'} {formatPrice(data.pending_top_up)}</p>
                ) : null}
                {data.pending_withdrawal > 0 ? (
                  <p className="rounded-xl bg-amber-500/10 px-3 py-2">{ar ? 'سحب قيد المراجعة:' : 'Pending withdraw:'} {formatPrice(data.pending_withdrawal)}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <section className="glass-strong rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-bold text-[#8a8da8]">{ar ? 'طلبات الشحن والسحب' : 'Top-up & withdrawal requests'}</h3>
            {data.requests.length === 0 ? (
              <p className="text-center text-xs text-[#8a8da8]">{ar ? 'لا توجد طلبات' : 'No requests'}</p>
            ) : (
              <ul className="space-y-2">
                {data.requests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-xl bg-white/40 px-3 py-2 text-sm dark:bg-white/5">
                    <span>{r.type === 'top_up' ? (ar ? 'شحن' : 'Top up') : (ar ? 'سحب' : 'Withdraw')}{r.payment_method ? ` · ${r.payment_method}` : ''}</span>
                    <span className="font-bold">{formatPrice(r.amount)}</span>
                    <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'destructive'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-strong rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-bold text-[#8a8da8]">{ar ? 'حركات المحفظة' : 'Wallet activity'}</h3>
            {data.transactions.length === 0 ? (
              <p className="text-center text-xs text-[#8a8da8]">{ar ? 'لا توجد حركات' : 'No transactions'}</p>
            ) : (
              <ul className="space-y-2">
                {data.transactions.map((tx) => {
                  const credit = tx.type === 'credit';
                  return (
                    <li key={tx.id} className="flex gap-3 rounded-xl bg-white/40 px-3 py-2.5 dark:bg-white/5">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        credit ? 'bg-[#28c76f]/15 text-[#28c76f]' : 'bg-[#ea5455]/10 text-[#ea5455]',
                      )}
                      >
                        {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        {tx.note ? <p className="font-medium">{tx.note}</p> : null}
                        <p className="text-xs text-[#8a8da8]">{ar ? 'بعد:' : 'After:'} {formatPrice(tx.balance_after)}</p>
                      </div>
                      <p className={cn('font-bold', credit ? 'text-[#28c76f]' : 'text-[#ea5455]')}>
                        {credit ? '+' : '−'}{formatPrice(tx.amount)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
