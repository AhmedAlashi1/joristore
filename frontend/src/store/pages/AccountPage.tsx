import { FileText, Languages, Loader2, LogIn, LogOut, MapPin, Package, Phone, Plus, Settings, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../lib/api';
import { useCustomer, type CustomerAddress } from '../providers/customer-provider';
import { enablePushFromUserGesture, pushFailureMessage } from '../lib/push-subscribe';
import { useNotifications } from '../providers/notification-provider';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { useLocale } from '../providers/locale-provider';

export function AccountPage() {
  const { t, locale, toggleLocale } = useLocale();
  const ar = locale === 'ar';
  const { customer, isLoggedIn, login, register, logout, refresh } = useCustomer();
  const { refresh, permission, pushEnabled } = useNotifications();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [addrOpen, setAddrOpen] = useState(false);
  const [addrForm, setAddrForm] = useState({ full_name: '', phone: '', city: '', area: '', street: '', building: '' });

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

  const saveAddress = async () => {
    if (!addrForm.full_name || !addrForm.city) return;
    setLoading(true);
    try {
      await customerApi.addAddress(addrForm);
      setAddrOpen(false);
      setAddrForm({ full_name: '', phone: '', city: '', area: '', street: '', building: '' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id: number) => {
    await customerApi.deleteAddress(id);
    await refresh();
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

        <div className="glass-strong space-y-3 rounded-2xl p-4">
          {mode === 'register' ? (
            <>
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm" placeholder={ar ? 'الاسم الأول *' : 'First name *'} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm" placeholder={ar ? 'اسم العائلة' : 'Last name'} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm" placeholder={ar ? 'البريد' : 'Email'} value={email} onChange={(e) => setEmail(e.target.value)} />
            </>
          ) : null}
          <div className="relative">
            <Phone size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
            <input className="glass-input w-full rounded-xl py-3 ps-11 pe-4 text-sm" placeholder={ar ? 'رقم الجوال *' : 'Phone *'} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
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
          <h2 className="mb-3 text-sm font-bold text-[var(--fg)]">{t.appearance}</h2>
          <AppearanceSettings />
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

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin size={16} className="text-[var(--primary)]" />
          {ar ? 'عناويني' : 'My addresses'}
        </h2>
        <button type="button" onClick={() => setAddrOpen(true)} className="flex items-center gap-1 rounded-xl bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
          <Plus size={14} /> {ar ? 'إضافة' : 'Add'}
        </button>
      </div>

      {(customer?.addresses ?? []).length === 0 ? (
        <div className="glass rounded-2xl py-8 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد عناوين' : 'No addresses'}</div>
      ) : (
        <div className="space-y-2">
          {(customer?.addresses ?? []).map((addr: CustomerAddress) => (
            <div key={addr.id} className="glass-strong card-pop rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{addr.full_name} {addr.is_default ? <span className="text-[10px] text-[var(--primary)]">({ar ? 'افتراضي' : 'default'})</span> : null}</p>
                  <p className="mt-1 text-xs text-[#6f6b7d]">{addr.city}{addr.area ? `، ${addr.area}` : ''}</p>
                  <p className="text-xs text-[#8a8da8]">{[addr.street, addr.building].filter(Boolean).join(' — ')}</p>
                </div>
                <button type="button" onClick={() => void deleteAddress(addr.id)} className="text-[#ea5455]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/orders" className="glass-strong glass-interactive flex items-center gap-3 rounded-2xl px-4 py-4">
        <Package size={20} className="text-[var(--primary)]" />
        <span className="text-sm font-semibold">{ar ? 'طلباتي' : 'My orders'}</span>
      </Link>

      <section className="glass-strong rounded-2xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Settings size={16} className="text-[var(--primary)]" />
          {ar ? 'الإعدادات' : 'Settings'}
        </h2>
        <div className="space-y-2">
          <button type="button" onClick={toggleLocale} className="glass flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><Languages size={16} className="text-[var(--primary)]" /> {ar ? 'اللغة' : 'Language'}</span>
            <span className="font-bold text-[var(--primary)]">{locale === 'ar' ? 'العربية' : 'English'}</span>
          </button>
          <AppearanceSettings />
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const result = await enablePushFromUserGesture();
                if (!result.ok) {
                  window.alert(pushFailureMessage(result.reason, ar));
                  return;
                }
                await refresh();
                window.location.reload();
              })();
            }}
            className="glass flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm"
          >
            <span>{ar ? 'إشعارات الجوال' : 'Phone notifications'}</span>
            <span className="text-xs font-bold text-[var(--primary)]">
              {permission === 'granted'
                ? (pushEnabled ? (ar ? 'Push مفعّل' : 'Push on') : (ar ? 'مفعّلة' : 'On'))
                : (ar ? 'تفعيل' : 'Enable')}
            </span>
          </button>
          <Link to="/terms" className="glass flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <FileText size={16} className="text-[var(--primary)]" />
            {ar ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </Link>
        </div>
      </section>

      {addrOpen ? (
        <div className="modal-backdrop fixed inset-0 z-[60] flex items-end bg-black/40 p-4 backdrop-blur-sm">
          <div className="glass-strong w-full max-w-[480px] animate-[page-in_0.35s_ease] rounded-3xl p-5">
            <h3 className="mb-4 text-lg font-bold">{ar ? 'عنوان جديد' : 'New address'}</h3>
            <div className="space-y-3">
              {(['full_name', 'phone', 'city', 'area', 'street', 'building'] as const).map((key) => (
                <input
                  key={key}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                  placeholder={key}
                  value={addrForm[key]}
                  onChange={(e) => setAddrForm({ ...addrForm, [key]: e.target.value })}
                />
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="glass flex-1 rounded-xl py-3 text-sm font-semibold" onClick={() => setAddrOpen(false)}>{t.dismiss}</button>
              <button type="button" className="btn-primary flex-1" onClick={() => void saveAddress()} disabled={loading}>{ar ? 'حفظ' : 'Save'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
