import { Bell, CheckCheck, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { FormField } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { useNotify } from '../lib/notify';
import { cn } from '../lib/cn';
import { useI18n } from '../providers/i18n-provider';

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
  data?: { order_id?: number };
};

type SentRow = {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  customer?: { id: number; first_name: string; last_name?: string; phone?: string };
};

type CustomerOption = { id: number; name: string; phone?: string };

export function NotificationsPage() {
  const { locale } = useI18n();
  const notify = useNotify();
  const ar = locale === 'ar';

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [sentRows, setSentRows] = useState<SentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentLoading, setSentLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [sentLastPage, setSentLastPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendCustomerId, setSendCustomerId] = useState<string>('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notifications', {
        params: { page, per_page: 20, unread_only: unreadOnly || undefined },
      });
      const payload = ensureApiSuccess<{ data: NotificationRow[]; last_page: number }>(res, '');
      setRows(payload?.data || []);
      setLastPage(payload?.last_page || 1);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل الإشعارات' : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [ar, notify, page, unreadOnly]);

  const loadSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const res = await api.get('/admin/customer-notifications', {
        params: { page: sentPage, per_page: 20 },
      });
      const payload = ensureApiSuccess<{ data: SentRow[]; last_page: number }>(res, '');
      setSentRows(payload?.data || []);
      setSentLastPage(payload?.last_page || 1);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل تحميل سجل الإرسال' : 'Failed to load sent log');
    } finally {
      setSentLoading(false);
    }
  }, [ar, notify, sentPage]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSent(); }, [loadSent]);

  useEffect(() => {
    api.get('/admin/customers/options')
      .then((res) => {
        const payload = ensureApiSuccess<CustomerOption[]>(res, '');
        setCustomers(Array.isArray(payload) ? payload : []);
      })
      .catch(() => undefined);
  }, []);

  const markRead = async (id: number) => {
    try {
      await api.post(`/admin/notifications/${id}/read`);
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل' : 'Failed');
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/admin/notifications/read-all');
      notify.success(ar ? 'تم تعليم الكل كمقروء' : 'All marked as read');
      await load();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل' : 'Failed');
    }
  };

  const sendToCustomers = async () => {
    if (!sendTitle.trim() || !sendMessage.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/admin/customer-notifications/send', {
        title: sendTitle.trim(),
        message: sendMessage.trim(),
        customer_id: sendCustomerId ? Number(sendCustomerId) : undefined,
      });
      const payload = ensureApiSuccess<{ sent_count: number; push_count?: number }>(res, '');
      const pushPart = payload.push_count != null
        ? (ar ? ` — وصل push لـ ${payload.push_count} جهاز` : ` — push delivered to ${payload.push_count} devices`)
        : '';
      notify.success(
        ar
          ? `تم الإرسال إلى ${payload.sent_count} عميل${pushPart}`
          : `Sent to ${payload.sent_count} customer(s)${pushPart}`,
      );
      setSendTitle('');
      setSendMessage('');
      setSendCustomerId('');
      await loadSent();
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الإرسال' : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <div className="glass-strong rounded-2xl p-4">
        <h3 className="mb-1 text-lg font-bold">{ar ? 'إرسال إشعار للعملاء' : 'Send to customers'}</h3>
        <p className="mb-3 text-sm text-[#8a8da8]">
          {ar
            ? 'يُحفظ في التطبيق + إشعار push للعملاء المسجّلين والمفعّل لهم الإشعارات'
            : 'Saved in-app + Web Push for customers who enabled notifications'}
        </p>
        <div className="space-y-3">
          <FormField label={ar ? 'عميل (اختياري)' : 'Customer (optional)'}>
            <select
              className="glass-input w-full rounded-xl px-3 py-2 text-sm"
              value={sendCustomerId}
              onChange={(e) => setSendCustomerId(e.target.value)}
            >
              <option value="">{ar ? 'جميع العملاء النشطين' : 'All active customers'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={ar ? 'العنوان *' : 'Title *'}>
            <Input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} />
          </FormField>
          <FormField label={ar ? 'الرسالة *' : 'Message *'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
          </FormField>
          <Button onClick={() => void sendToCustomers()} disabled={sending || !sendTitle.trim() || !sendMessage.trim()}>
            <Send className="me-2 h-4 w-4" />
            {sending ? (ar ? 'جاري الإرسال...' : 'Sending...') : (ar ? 'إرسال' : 'Send')}
          </Button>
        </div>
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-bold">{ar ? 'سجل إرسال العملاء' : 'Customer send log'}</h3>
        </div>
        {sentLoading ? (
          <div className="flex min-h-[160px] items-center justify-center"><LoadingSpinner size="md" /></div>
        ) : sentRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#8a8da8]">{ar ? 'لا يوجد سجل بعد' : 'No sends yet'}</div>
        ) : (
          <div className="divide-y divide-white/10">
            {sentRows.map((row) => (
              <div key={row.id} className="px-4 py-3">
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-[#8a8da8]">{row.message}</p>
                <p className="mt-1 text-xs text-[#8a8da8]">
                  {row.customer
                    ? `${row.customer.first_name} ${row.customer.last_name || ''}`.trim()
                    : (ar ? 'عميل' : 'Customer')}
                  {' · '}
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
        {sentLastPage > 1 ? (
          <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
            <Button variant="secondary" size="sm" disabled={sentPage <= 1} onClick={() => setSentPage((p) => p - 1)}>{ar ? 'السابق' : 'Prev'}</Button>
            <span className="text-sm text-[#8a8da8]">{sentPage} / {sentLastPage}</span>
            <Button variant="secondary" size="sm" disabled={sentPage >= sentLastPage} onClick={() => setSentPage((p) => p + 1)}>{ar ? 'التالي' : 'Next'}</Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{ar ? 'إشعارات لوحة التحكم' : 'Admin alerts'}</h2>
          <p className="text-sm text-[#8a8da8]">{ar ? 'تنبيهات داخلية للفريق' : 'Internal team alerts'}</p>
        </div>
        <Button variant="secondary" onClick={markAllRead}>
          <CheckCheck className="me-2 h-4 w-4" />
          {ar ? 'تعليم الكل كمقروء' : 'Mark all read'}
        </Button>
      </div>

      <label className="inline-flex items-center gap-2 rounded-xl bg-white/30 px-3 py-2 text-sm dark:bg-white/5">
        <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} className="accent-[#7367f0]" />
        {ar ? 'غير المقروءة فقط' : 'Unread only'}
      </label>

      <div className="glass-strong overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><LoadingSpinner size="md" /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد إشعارات' : 'No notifications'}</div>
        ) : (
          <div className="divide-y divide-white/10">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-4 transition-colors hover:bg-white/20 dark:hover:bg-white/5',
                  !row.read_at && 'bg-[#7367f0]/5',
                )}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7367f0]/15 text-[#7367f0]">
                  <Bell size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-[#8a8da8]">{row.message}</p>
                  <p className="mt-1 text-xs text-[#8a8da8]">{new Date(row.created_at).toLocaleString()}</p>
                </div>
                {!row.read_at ? (
                  <Button variant="secondary" size="sm" onClick={() => markRead(row.id)}>
                    {ar ? 'قراءة' : 'Read'}
                  </Button>
                ) : null}
              </div>
            ))}
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
