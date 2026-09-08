import { useCallback, useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type ActivityRow = {
  id: number;
  action: string;
  module: string;
  description?: string;
  created_at: string;
  user?: { name: string };
};

type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };

export function ActivityLogsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [module, setModule] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/activity-logs', { params: { page, per_page: 20, module: module || undefined } });
      const payload = ensureApiSuccess<Paginated<ActivityRow>>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل التحميل' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [ar, module, notify, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-enter space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{ar ? 'سجل النشاطات' : 'Activity Log'}</h2>
        <p className="text-sm text-[#8a8da8]">{ar ? 'تتبع كل العمليات على المتجر' : 'Track all store operations'}</p>
      </div>

      <Input
        value={module}
        onChange={(e) => { setModule(e.target.value); setPage(1); }}
        placeholder={ar ? 'فلترة حسب الوحدة...' : 'Filter by module...'}
        className="max-w-xs"
      />

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد سجلات' : 'No records'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/20 bg-white/30 text-xs uppercase tracking-wider text-[#6f6b7d]">
                <tr>
                  <th className="px-4 py-3 text-start">{ar ? 'العملية' : 'Action'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'الوحدة' : 'Module'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-start">{ar ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/15 hover:bg-white/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.description ?? row.action}</p>
                      <p className="text-xs text-[#8a8da8]">{row.action}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.module}</td>
                    <td className="px-4 py-3">{row.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#8a8da8]">{new Date(row.created_at).toLocaleString()}</td>
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
    </div>
  );
}
