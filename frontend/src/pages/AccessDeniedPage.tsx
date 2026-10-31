import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

export function AccessDeniedPage({ permission }: { permission?: string }) {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const canManageRoles = hasPermission('roles.manage');

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="glass-strong flex max-w-md flex-col items-center rounded-2xl px-6 py-8">
        <ShieldAlert className="mb-3 text-[#ff9f43]" size={40} />
        <h1 className="text-lg font-bold">{ar ? 'لا توجد صلاحية' : 'Access denied'}</h1>
        <p className="mt-2 text-sm text-[#8a8da8]">
          {ar
            ? 'حسابك لا يملك صلاحية فتح هذه الصفحة. اطلب من مدير المتجر تحديث دورك.'
            : 'Your account cannot open this page. Ask the store owner to update your role.'}
        </p>
        {permission ? (
          <code className="mt-3 rounded-lg bg-black/5 px-2 py-1 text-[10px] dir-ltr">{permission}</code>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/admin/dashboard">
            <Button variant="default">{ar ? 'لوحة التحكم' : 'Dashboard'}</Button>
          </Link>
          {canManageRoles ? (
            <Link to="/admin/roles">
              <Button variant="ghost">{ar ? 'الأدوار والصلاحيات' : 'Roles'}</Button>
            </Link>
          ) : null}
        </div>
        <p className="mt-4 text-[11px] text-[#8a8da8]">
          {ar ? 'بعد تعديل الصلاحيات: سجّل خروج ثم دخول من جديد.' : 'After permission changes: log out and sign in again.'}
        </p>
      </div>
    </div>
  );
}
