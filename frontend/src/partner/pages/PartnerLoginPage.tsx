import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { partnerApi } from '../../lib/partner-api';
import { setPartnerInfo, setPartnerToken } from '../../lib/partner-auth';
import { useI18n } from '../../providers/i18n-provider';

export function PartnerLoginPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const navigate = useNavigate();
  const [loginPhone, setLoginPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await partnerApi.post('/store/partner/login', { login_phone: loginPhone, password });
      const data = res.data?.data;
      setPartnerToken(data.token);
      setPartnerInfo(data.partner);
      navigate('/partner/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (ar ? 'فشل تسجيل الدخول' : 'Login failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">{ar ? 'دخول الشريك' : 'Partner login'}</h1>
          <p className="text-sm text-slate-500 mt-1">{ar ? 'تابع طلباتك وأرباحك' : 'Track orders and commissions'}</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <label className="block text-sm">
          <span className="mb-1 block">{ar ? 'رقم الجوال' : 'Mobile number'}</span>
          <Input value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} autoComplete="tel" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{ar ? 'كلمة المرور' : 'Password'}</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (ar ? 'جاري الدخول…' : 'Signing in…') : (ar ? 'دخول' : 'Sign in')}
        </Button>
      </form>
    </div>
  );
}
