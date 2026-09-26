import { ChevronLeft, FileText, Languages, Loader2, LogIn, LogOut, MapPin, MessageCircle, Package, Phone, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomer } from '../providers/customer-provider';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { PushNotificationToggle } from '../components/settings/PushNotificationToggle';
import { useLocale } from '../providers/locale-provider';

export function AccountPage() {
  const { t, locale, toggleLocale } = useLocale();
  const ar = locale === 'ar';
  const { customer, isLoggedIn, login, register, logout, refresh: refreshCustomer } = useCustomer();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(phone);
      } else {
        await register({ first_name: firstName, last_name: lastName || undefined, email: email || undefined, phone });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="space-y-4 pb-4">
        <div className="glass-strong card-pop rounded-3xl p-5 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7367f0] to-[#9e95f5] text-white shadow-lg">
            <User size={40} />
          </div>
          <h1 className="text-xl font-bold">{ar ? 'حسابي' : 'My Account'}</h1>
          <p className="mt-1 text-sm text-[#8a8da8]">{ar ? 'سجّل دخول أو أنشئ حساباً' : 'Login or create account'}</p>
        </div>

        <div className="glass flex rounded-2xl p-1">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${mode === 'login' ? 'bg-[var(--primary)] text-white shadow-md' : ''}`}>
            {ar ? 'دخول' : 'Login'}
          </button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${mode === 'register' ? 'bg-[var(--primary)] text-white shadow-md' : ''}`}>
            {ar ? 'تسجيل' : 'Register'}
          </button>
        </div>

        <div className="glass-strong flex flex-col gap-4 rounded-2xl p-4">
          {mode === 'register' ? (
            <>
              <input className="glass-input block w-full rounded-xl px-4 py-3.5 text-sm" placeholder={ar ? 'الاسم الأول *' : 'First name *'} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="glass-input block w-full rounded-xl px-4 py-3.5 text-sm" placeholder={ar ? 'اسم العائلة' : 'Last name'} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input className="glass-input block w-full rounded-xl px-4 py-3.5 text-sm" placeholder={ar ? 'البريد' : 'Email'} value={email} onChange={(e) => setEmail(e.target.value)} />
            </>
          ) : null}
          <div className="relative">
            <Phone size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
            <input className="glass-input block w-full rounded-xl py-3.5 ps-11 pe-4 text-sm" placeholder={ar ? 'رقم الجوال *' : 'Phone *'} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <button type="button" className="btn-primary w-full" onClick={handleAuth} disabled={loading || !phone}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            {mode === 'login' ? (ar ? 'دخول' : 'Login') : (ar ? 'إنشاء حساب' : 'Create account')}
          </button>
          {mode === 'login' ? (
            <p className="text-center text-xs text-[#8a8da8]">
              {ar ? 'تجربة: 0501111111' : 'Demo: 0501111111'}
            </p>
          ) : null}
        </div>

        <section className="glass-strong rounded-2xl p-4">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--fg)]">
            <Settings size={16} className="text-[var(--primary)]" />
            {ar ? 'الإعدادات' : 'Settings'}
          </h2>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={toggleLocale} className="glass flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm">
              <span className="flex items-center gap-2"><Languages size={16} className="text-[var(--primary)]" /> {ar ? 'اللغة' : 'Language'}</span>
              <span className="font-bold text-[var(--primary)]">{locale === 'ar' ? 'العربية' : 'English'}</span>
            </button>
            <AppearanceSettings />
            <Link to="/contact" className="glass flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm">
              <span className="flex items-center gap-2"><MessageCircle size={16} className="text-[var(--primary)]" /> {t.contactUs}</span>
              <ChevronLeft size={18} className="text-[#8a8da8] rtl:rotate-180" />
            </Link>
            <Link to="/terms" className="glass flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-sm">
              <FileText size={16} className="text-[var(--primary)]" />
              {t.termsAndConditions}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="glass-strong card-pop flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7367f0] to-[#9e95f5] text-2xl font-bold text-white">
          {customer?.first_name?.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{customer?.full_name}</p>
          <p className="text-xs text-[#8a8da8]" dir="ltr">{customer?.phone}</p>
          <p className="text-xs text-[var(--primary)]">{customer?.orders_count} {ar ? 'طلب' : 'orders'}</p>
        </div>
        <button type="button" onClick={logout} className="glass rounded-xl p-2.5 text-[#ea5455]">
          <LogOut size={18} />
        </button>
      </div>

      <Link to="/account/addresses" className="glass-strong glass-interactive flex items-center justify-between gap-3 rounded-2xl px-4 py-4">
        <span className="flex min-w-0 items-center gap-3">
          <MapPin size={20} className="shrink-0 text-[var(--primary)]" />
          <span className="text-sm font-semibold">{t.savedAddresses}</span>
        </span>
        <span
          className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] px-2 text-xs font-bold tabular-nums text-[var(--primary)]"
          aria-label={ar ? `${(customer?.addresses ?? []).length} عنوان` : `${(customer?.addresses ?? []).length} addresses`}
        >
          {(customer?.addresses ?? []).length}
        </span>
      </Link>

      <Link to="/orders" className="glass-strong glass-interactive flex items-center justify-between gap-3 rounded-2xl px-4 py-4">
        <span className="flex min-w-0 items-center gap-3">
          <Package size={20} className="shrink-0 text-[var(--primary)]" />
          <span className="text-sm font-semibold">{ar ? 'طلباتي' : 'My orders'}</span>
        </span>
        <span
          className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] px-2 text-xs font-bold tabular-nums text-[var(--primary)]"
          aria-label={ar ? `${customer?.orders_count ?? 0} طلب` : `${customer?.orders_count ?? 0} orders`}
        >
          {customer?.orders_count ?? 0}
        </span>
      </Link>

      <section className="glass-strong rounded-2xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Settings size={16} className="text-[var(--primary)]" />
          {ar ? 'الإعدادات' : 'Settings'}
        </h2>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={toggleLocale} className="glass flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm">
            <span className="flex items-center gap-2"><Languages size={16} className="text-[var(--primary)]" /> {ar ? 'اللغة' : 'Language'}</span>
            <span className="font-bold text-[var(--primary)]">{locale === 'ar' ? 'العربية' : 'English'}</span>
          </button>
          <AppearanceSettings />
          <PushNotificationToggle />
          <Link to="/contact" className="glass flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm">
            <span className="flex items-center gap-2"><MessageCircle size={16} className="text-[var(--primary)]" /> {t.contactUs}</span>
            <ChevronLeft size={18} className="text-[#8a8da8] rtl:rotate-180" />
          </Link>
          <Link to="/terms" className="glass flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-sm">
            <FileText size={16} className="text-[var(--primary)]" />
            {t.termsAndConditions}
          </Link>
        </div>
      </section>

    </div>
  );
}
