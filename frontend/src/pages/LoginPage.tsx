import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { setAdminAuthInfo, setAuthToken, type AdminAuthInfo } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@admin.net');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const ar = locale === 'ar';

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/admin/login', { email, password });
      const token = res?.data?.data?.token;
      const user = res?.data?.data?.user as AdminAuthInfo | undefined;
      if (!token) throw new Error('Token not found');
      if (!user) throw new Error('User data not found');
      setAuthToken(token);
      setAdminAuthInfo(user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-[#e8e9f3]">
      {/* Animated background */}
      <div className="app-bg" aria-hidden>
        <div className="app-bg-orb app-bg-orb-1" style={{ background: 'rgba(115,103,240,0.4)' }} />
        <div className="app-bg-orb app-bg-orb-2" style={{ background: 'rgba(40,199,111,0.2)' }} />
        <div className="app-bg-orb app-bg-orb-3" style={{ background: 'rgba(255,159,67,0.15)' }} />
      </div>

      {/* Dark overlay for login */}
      <div className="fixed inset-0 z-0 bg-[#0f0f1a]/80" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
        {/* Left showcase panel */}
        <section className="relative hidden items-center justify-center overflow-hidden p-10 lg:flex">
          <div className="relative w-full max-w-lg space-y-6">
            <div className="card-enter glass-strong rounded-3xl p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#7367f0]/20 px-3 py-1 text-xs font-semibold text-[#a89cf8]">
                <Sparkles size={12} />
                {ar ? 'لوحة تحكم احترافية' : 'Professional Admin Panel'}
              </div>
              <h2 className="mb-3 text-3xl font-bold leading-tight">
                {ar ? 'إدارة متجرك' : 'Manage Your Store'}
                <span className="glow-text"> {ar ? 'بذكاء' : 'Smartly'}</span>
              </h2>
              <p className="text-sm text-[#a2a5be]">
                {ar
                  ? 'واجهة زجاجية حديثة مع تحكم كامل بالصلاحيات والأدوار.'
                  : 'Modern glass interface with full control over roles and permissions.'}
              </p>
            </div>

            {/* Floating stat cards */}
            <div className="relative h-48">
              <div className="card-enter card-enter-1 glass absolute start-0 top-0 w-36 rounded-2xl p-4">
                <p className="text-xs text-[#a2a5be]">{ar ? 'المستخدمون' : 'Users'}</p>
                <p className="mt-2 text-2xl font-bold">624</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#7367f0] to-[#9e95f5]" />
                </div>
              </div>
              <div className="card-enter card-enter-2 glass absolute end-4 top-8 w-36 rounded-2xl p-4">
                <p className="text-xs text-[#a2a5be]">{ar ? 'الطلبات' : 'Orders'}</p>
                <p className="mt-2 text-2xl font-bold">124k</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#28c76f] to-[#48da89]" />
                </div>
              </div>
              <div className="card-enter card-enter-3 glass absolute bottom-0 start-1/2 w-40 -translate-x-1/2 rounded-2xl p-4">
                <p className="text-xs text-[#a2a5be]">{ar ? 'الإيرادات' : 'Revenue'}</p>
                <p className="mt-2 text-2xl font-bold">$48k</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-[#ff9f43] to-[#ffb976]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="page-enter w-full max-w-[420px]">
            {/* Top controls */}
            <div className="mb-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                className="glass rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white/10"
              >
                {locale === 'en' ? 'AR' : 'EN'}
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="glass rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white/10"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>

            <div className="glass-strong rounded-3xl p-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)] sm:p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7367f0] to-[#9e95f5] shadow-[0_8px_24px_rgba(115,103,240,0.45)]">
                <Sparkles size={22} className="text-white" />
              </div>

              <h1 className="mb-1 text-2xl font-bold text-white">
                {t.welcomeBack} 👋
              </h1>
              <p className="mb-7 text-sm text-[#a2a5be]">{t.signInSubtitle}</p>

              <form onSubmit={onSubmit} className="space-y-4">
                {error ? (
                  <p className="modal-panel-enter rounded-xl border border-[#ff4c51]/40 bg-[#ff4c51]/15 px-3 py-2.5 text-sm text-[#ff9ca0] backdrop-blur-sm">
                    {error}
                  </p>
                ) : null}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm text-[#b8bcde]">
                    <Mail size={14} />
                    {t.email}
                  </label>
                  <Input
                    className="glass-input h-11 rounded-xl border-white/10 bg-white/5 text-[#e8e9f3] placeholder:text-[#6b7094] focus-visible:ring-[#7367f0]/50"
                    placeholder={ar ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm text-[#b8bcde]">
                    <Lock size={14} />
                    {t.password}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      className="glass-input h-11 rounded-xl border-white/10 bg-white/5 pe-10 text-[#e8e9f3] placeholder:text-[#6b7094] focus-visible:ring-[#7367f0]/50"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[#6b7094] transition-colors hover:text-[#e8e9f3]"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="btn-glow h-11 w-full rounded-xl bg-gradient-to-r from-[#7367f0] to-[#8b7ff5] text-white shadow-[0_8px_24px_rgba(115,103,240,0.4)] hover:from-[#685dd8] hover:to-[#7367f0]"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span className="ms-1">{t.login}</span>
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
