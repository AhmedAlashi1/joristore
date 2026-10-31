import { ArrowDownLeft, ArrowUpRight, ChevronLeft, CreditCard, Loader2, Upload, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { paymentMethodInstructions, paymentMethodLabel, type PaymentMethodConfig } from '../../lib/payment-methods';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { apiErrorMessage, customerApi, storeApi, unwrap } from '../lib/api';
import { getCustomerId } from '../lib/customer-storage';
import { cn, formatPrice } from '../lib/utils';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';

const fieldClass = 'store-field rounded-xl px-3 py-2.5 text-sm';

type WalletOverview = {
  balance: number;
  pending_top_up: number;
  pending_withdrawal: number;
};

type WalletTxn = {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  label_ar: string;
  label_en: string;
  note?: string | null;
  created_at?: string;
};

type WalletReq = {
  id: number;
  type: 'top_up' | 'withdrawal';
  amount: number;
  status: string;
  customer_note?: string | null;
  admin_note?: string | null;
  created_at?: string;
  processed_at?: string | null;
};

function statusLabel(status: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    pending: ['قيد المراجعة', 'Pending'],
    approved: ['مقبول', 'Approved'],
    rejected: ['مرفوض', 'Rejected'],
    cancelled: ['ملغى', 'Cancelled'],
  };
  const pair = map[status] ?? [status, status];
  return ar ? pair[0] : pair[1];
}

export function WalletPage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { customer } = useCustomer();
  const customerId = getCustomerId();
  const [overview, setOverview] = useState<WalletOverview | null>(null);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [requests, setRequests] = useState<WalletReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'activity' | 'top_up' | 'withdraw'>('activity');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [topUpMethods, setTopUpMethods] = useState<PaymentMethodConfig[]>([]);
  const [withdrawMethods, setWithdrawMethods] = useState<PaymentMethodConfig[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [withdrawPaymentMethod, setWithdrawPaymentMethod] = useState('');
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [payMethodsLoaded, setPayMethodsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const feed = await customerApi.walletFeed(signal);
      setOverview(feed.overview);
      setTxns(Array.isArray(feed.transactions) ? feed.transactions : []);
      setRequests(Array.isArray(feed.requests) ? feed.requests : []);
    } catch (e) {
      if (signal?.aborted) return;
      setError(apiErrorMessage(e, ar));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    if (!customerId) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [customerId, load]);

  useEffect(() => {
    if (tab !== 'top_up' && tab !== 'withdraw') return;
    if (payMethodsLoaded) return;
    setPaymentMethodsLoading(true);
    storeApi
      .paymentMethods()
      .then((r) => {
        const methods = unwrap<PaymentMethodConfig[]>(r);
        const online = methods.filter((m) => m.transfer_type === 'online');
        setTopUpMethods(online);
        setWithdrawMethods(online);
        setPaymentMethod((prev) => (prev && online.some((m) => m.id === prev) ? prev : online[0]?.id ?? ''));
        setWithdrawPaymentMethod((prev) => (prev && online.some((m) => m.id === prev) ? prev : online[0]?.id ?? ''));
        setPayMethodsLoaded(true);
      })
      .catch(() => {
        setTopUpMethods([]);
        setWithdrawMethods([]);
      })
      .finally(() => setPaymentMethodsLoading(false));
  }, [tab, payMethodsLoaded]);

  if (!customerId) {
    return <Navigate to="/account" replace />;
  }

  const onReceipt = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await customerApi.uploadPaymentReceipt(file);
      setReceiptPath(uploaded.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const selectedPay = topUpMethods.find((m) => m.id === paymentMethod);
  const needsReceipt = Boolean(selectedPay?.requires_receipt);
  const payInstructions = selectedPay ? paymentMethodInstructions(selectedPay, ar) : '';

  const submitTopUp = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    if (!paymentMethod) {
      setError(ar ? 'اختر طريقة الدفع' : 'Select a payment method');
      return;
    }
    if (needsReceipt && !receiptPath) {
      setError(ar ? 'ارفع صورة إيصال الدفع' : 'Upload payment receipt');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await customerApi.walletTopUp({
        amount: value,
        payment_method: paymentMethod,
        receipt_path: receiptPath ?? undefined,
        note: note || undefined,
      });
      setAmount('');
      setNote('');
      setReceiptPath(null);
      setTransferReference('');
      setAccountHolderName('');
      setSuccess(ar ? 'تم إرسال طلب الشحن. سنراجعه قريباً.' : 'Top-up request sent for review.');
      setTab('activity');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, ar));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWithdrawPay = withdrawMethods.find((m) => m.id === withdrawPaymentMethod);

  const submitWithdraw = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    if (!withdrawPaymentMethod) {
      setError(ar ? 'اختر طريقة استلام المبلغ' : 'Select a payout method');
      return;
    }
    if (!transferReference.trim()) {
      setError(ar ? 'أدخل رقم حسابك أو رقم الجوال للتحويل' : 'Enter your account or mobile number for payout');
      return;
    }
    if (!accountHolderName.trim()) {
      setError(ar ? 'أدخل اسم صاحب الحساب' : 'Enter account holder name');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await customerApi.walletWithdraw({
        amount: value,
        payment_method: withdrawPaymentMethod,
        transfer_reference: transferReference.trim(),
        account_holder_name: accountHolderName.trim(),
        note: note || undefined,
      });
      setAmount('');
      setNote('');
      setTransferReference('');
      setAccountHolderName('');
      setSuccess(ar ? 'تم إرسال طلب السحب.' : 'Withdrawal request sent.');
      setTab('activity');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, ar));
    } finally {
      setSubmitting(false);
    }
  };

  const balance = overview?.balance ?? customer?.wallet_balance ?? 0;

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => { setTab(id); setError(''); setSuccess(''); }}
      className={cn(
        'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
        tab === id ? 'checkout-choice-active' : 'checkout-choice text-[var(--fg)]',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Link to="/account" className="glass rounded-xl p-2 text-[var(--primary)]">
          <ChevronLeft size={20} className="rtl:rotate-180" />
        </Link>
        <h1 className="text-base font-bold">{ar ? 'المحفظة' : 'Wallet'}</h1>
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-store-muted">{ar ? 'الرصيد المتاح' : 'Available balance'}</p>
            <p className="text-2xl font-black text-[var(--primary)]">{formatPrice(balance)}</p>
          </div>
        </div>
        {(overview?.pending_top_up ?? 0) > 0 || (overview?.pending_withdrawal ?? 0) > 0 ? (
          <div className="mt-3 space-y-1 border-t border-dashed border-[var(--glass-border)] pt-3 text-[11px] text-store-muted">
            {(overview?.pending_top_up ?? 0) > 0 ? (
              <p>{ar ? 'شحن قيد المراجعة:' : 'Pending top-up:'} {formatPrice(overview!.pending_top_up)}</p>
            ) : null}
            {(overview?.pending_withdrawal ?? 0) > 0 ? (
              <p>{ar ? 'سحب قيد المراجعة:' : 'Pending withdrawal:'} {formatPrice(overview!.pending_withdrawal)}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        {tabBtn('activity', ar ? 'السجل' : 'Activity')}
        {tabBtn('top_up', ar ? 'شحن' : 'Top up')}
        {tabBtn('withdraw', ar ? 'سحب' : 'Withdraw')}
      </div>

      {error ? (
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium text-[#ea5455]">{error}</p>
          <button type="button" className="text-xs font-bold text-[var(--primary)] underline" onClick={() => void load()}>
            {ar ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : null}
      {success ? <p className="text-center text-xs font-medium text-[#28c76f]">{success}</p> : null}

      {tab === 'activity' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[var(--primary)]" /></div>
          ) : null}
          <section className={loading ? 'pointer-events-none opacity-50' : undefined}>
            <h2 className="mb-2 text-xs font-bold text-store-muted">{ar ? 'طلبات الشحن والسحب' : 'Top-up & withdrawal requests'}</h2>
            {loading ? null : requests.length === 0 ? (
              <p className="glass rounded-xl p-4 text-center text-xs text-store-muted">{ar ? 'لا توجد طلبات' : 'No requests yet'}</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={`req-${r.id}`} className="glass rounded-xl px-3 py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {r.type === 'top_up' ? (ar ? 'شحن' : 'Top up') : (ar ? 'سحب' : 'Withdraw')}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        r.status === 'pending' ? 'bg-amber-500/15 text-amber-700' : r.status === 'approved' ? 'bg-[#28c76f]/15 text-[#28c76f]' : 'bg-[#ea5455]/10 text-[#ea5455]',
                      )}
                      >
                        {statusLabel(r.status, ar)}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--primary)]">{formatPrice(r.amount)}</p>
                    {r.customer_note ? <p className="mt-1 text-store-muted">{r.customer_note}</p> : null}
                    {r.admin_note && r.status !== 'pending' ? (
                      <p className="mt-1 text-[10px] text-store-muted">{ar ? 'رد الإدارة:' : 'Admin:'} {r.admin_note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold text-store-muted">{ar ? 'حركات المحفظة' : 'Wallet transactions'}</h2>
            {loading ? null : txns.length === 0 ? (
              <p className="glass rounded-xl p-4 text-center text-xs text-store-muted">{ar ? 'لا توجد حركات بعد' : 'No transactions yet'}</p>
            ) : (
              <ul className="space-y-2">
                {txns.map((tx) => {
                  const credit = tx.type === 'credit';
                  return (
                    <li key={tx.id} className="glass flex gap-3 rounded-xl px-3 py-2.5">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        credit ? 'bg-[#28c76f]/15 text-[#28c76f]' : 'bg-[#ea5455]/10 text-[#ea5455]',
                      )}
                      >
                        {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{ar ? tx.label_ar : tx.label_en}</p>
                        {tx.note ? <p className="mt-0.5 text-[10px] text-store-muted">{tx.note}</p> : null}
                        <p className="mt-1 text-[10px] text-store-muted">
                          {ar ? 'الرصيد بعد العملية:' : 'Balance after:'} {formatPrice(tx.balance_after)}
                        </p>
                      </div>
                      <p className={cn('shrink-0 text-sm font-bold', credit ? 'text-[#28c76f]' : 'text-[#ea5455]')}>
                        {credit ? '+' : '−'}{formatPrice(tx.amount)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="glass-strong flex flex-col gap-4 rounded-2xl p-4">
          <p className="text-xs leading-relaxed text-store-muted">
            {tab === 'top_up'
              ? (ar ? 'اختر طريقة الدفع الإلكتروني، أدخل المبلغ، وارفع إيصال التحويل. يُضاف الرصيد بعد موافقة الإدارة.' : 'Choose an online payment method, enter the amount, and upload the receipt. Balance is added after admin approval.')
              : (ar ? 'طلب سحب إلى حسابك. يُخصم الرصيد بعد الموافقة.' : 'Request a payout. Balance is debited after approval.')}
          </p>

          {tab === 'top_up' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--fg)]">
                <CreditCard size={14} className="text-[var(--primary)]" />
                {ar ? 'طريقة الدفع' : 'Payment method'}
              </p>
              {paymentMethodsLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="animate-spin text-[var(--primary)]" size={20} /></div>
              ) : topUpMethods.length === 0 ? (
                <p className="rounded-xl bg-[#ea5455]/10 px-3 py-2.5 text-xs font-medium text-[#ea5455]">
                  {ar ? 'لا توجد طرق دفع إلكترونية مفعّلة. فعّل جوال بي أو بال بي من لوحة التحكم.' : 'No online payment methods enabled. Enable Jawwal Pay or PalPay in admin.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topUpMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (!m.requires_receipt) setReceiptPath(null);
                      }}
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-start text-xs font-semibold transition-all',
                        paymentMethod === m.id ? 'checkout-choice-active' : 'checkout-choice',
                      )}
                    >
                      {paymentMethodLabel(m, ar)}
                    </button>
                  ))}
                </div>
              )}
              {(needsReceipt || selectedPay?.qr_image) && paymentMethod ? (
                <div className="checkout-panel mt-1 space-y-3 rounded-xl p-3">
                  {payInstructions ? <p className="text-[11px] leading-relaxed text-store-muted">{payInstructions}</p> : null}
                  {selectedPay?.qr_image ? (
                    <div className="relative mx-auto aspect-square w-full max-w-[168px] overflow-hidden rounded-xl border bg-white p-2 shadow-sm">
                      <StoreMediaImage src={selectedPay.qr_image} alt="QR" fit="contain" layout="fill" />
                    </div>
                  ) : null}
                  {needsReceipt ? (
                    <label className="checkout-upload mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold">
                      {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      {receiptPath ? (ar ? 'تم رفع الإيصال ✓' : 'Receipt uploaded ✓') : (ar ? 'رفع إيصال الدفع' : 'Upload payment receipt')}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => void onReceipt(e.target.files?.[0] ?? null)} />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : tab === 'withdraw' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--fg)]">
                <CreditCard size={14} className="text-[var(--primary)]" />
                {ar ? 'طريقة استلام المبلغ' : 'Payout method'}
              </p>
              {paymentMethodsLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="animate-spin text-[var(--primary)]" size={20} /></div>
              ) : withdrawMethods.length === 0 ? (
                <p className="rounded-xl bg-[#ea5455]/10 px-3 py-2.5 text-xs font-medium text-[#ea5455]">
                  {ar ? 'لا توجد طرق دفع إلكترونية مفعّلة. فعّل جوال بي أو بال بي من لوحة التحكم.' : 'No online payment methods enabled. Enable Jawwal Pay or PalPay in admin.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {withdrawMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setWithdrawPaymentMethod(m.id)}
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-start text-xs font-semibold transition-all',
                        withdrawPaymentMethod === m.id ? 'checkout-choice-active' : 'checkout-choice',
                      )}
                    >
                      {paymentMethodLabel(m, ar)}
                    </button>
                  ))}
                </div>
              )}
              {selectedWithdrawPay && paymentMethodInstructions(selectedWithdrawPay, ar) ? (
                <p className="checkout-panel rounded-xl p-3 text-[11px] leading-relaxed text-store-muted">
                  {paymentMethodInstructions(selectedWithdrawPay, ar)}
                </p>
              ) : null}
              {withdrawPaymentMethod ? (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder={ar ? 'رقم الجوال / الحساب لاستلام المبلغ' : 'Mobile or account number to receive payout'}
                    className={fieldClass}
                    dir="ltr"
                  />
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={ar ? 'اسم صاحب الحساب' : 'Account holder name'}
                    className={fieldClass}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--fg)]" htmlFor="wallet-amount">
              {ar ? 'المبلغ' : 'Amount'}
            </label>
            <input
              id="wallet-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={ar ? 'مثال: 100' : 'e.g. 100'}
              className={fieldClass}
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--fg)]" htmlFor="wallet-note">
              {ar ? 'ملاحظة (اختياري)' : 'Note (optional)'}
            </label>
            <textarea
              id="wallet-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ar ? 'أي تفاصيل إضافية للإدارة' : 'Any extra details for admin'}
              className={cn(fieldClass, 'min-h-[72px] resize-none text-xs')}
              rows={2}
            />
          </div>

          <button
            type="button"
            disabled={
              submitting
              || !amount
              || (tab === 'top_up' && (
                !paymentMethod
                || topUpMethods.length === 0
                || (needsReceipt && !receiptPath)
              ))
              || (tab === 'withdraw' && (
                !withdrawPaymentMethod
                || withdrawMethods.length === 0
                || !transferReference.trim()
                || !accountHolderName.trim()
              ))
            }
            onClick={() => void (tab === 'top_up' ? submitTopUp() : submitWithdraw())}
            className="btn-primary mt-1 w-full py-2.5 text-sm disabled:opacity-45"
          >
            {submitting ? <Loader2 className="mx-auto animate-spin" size={18} /> : (tab === 'top_up' ? (ar ? 'إرسال طلب الشحن' : 'Submit top-up') : (ar ? 'إرسال طلب السحب' : 'Submit withdrawal'))}
          </button>
        </div>
      )}
    </div>
  );
}
