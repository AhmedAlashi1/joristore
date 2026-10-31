import { HandCoins, LayoutDashboard, LogOut, Receipt } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { partnerApi } from '../lib/partner-api';
import { clearPartnerAuth, getPartnerInfo } from '../lib/partner-auth';
import { cn } from '../lib/cn';
import { useI18n } from '../providers/i18n-provider';

const links = [
  { to: '/partner/dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
  { to: '/partner/commissions', labelAr: 'الطلبات والأرباح', labelEn: 'Orders & earnings', icon: HandCoins },
  { to: '/partner/payouts', labelAr: 'سندات الصرف', labelEn: 'Payouts', icon: Receipt },
] as const;

export function PartnerLayout() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const partner = getPartnerInfo();

  const logout = async () => {
    try {
      await partnerApi.post('/store/partner/logout');
    } catch {
      /* ignore */
    }
    clearPartnerAuth();
    navigate('/partner/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 border-b md:border-b-0 md:border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">{ar ? 'بوابة الشريك' : 'Partner portal'}</p>
          <p className="font-semibold text-lg truncate">{partner?.name ?? '—'}</p>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {links.map(({ to, labelAr, labelEn, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap',
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {ar ? labelAr : labelEn}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" className="mt-6 w-full justify-start gap-2" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          {ar ? 'تسجيل الخروج' : 'Log out'}
        </Button>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
