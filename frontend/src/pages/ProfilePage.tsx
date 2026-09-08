import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FormField, FormGrid } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { getAdminAuthInfo, setAdminAuthInfo, type AdminAuthInfo } from '../lib/auth';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

export function ProfilePage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });

  useEffect(() => {
    api.get('/admin/profile')
      .then((res) => {
        const data = ensureApiSuccess<AdminAuthInfo>(res, '');
        setProfile({ name: data.name, email: data.email, phone: data.phone ?? '' });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/profile', profile);
      const data = ensureApiSuccess<AdminAuthInfo>(res, '');
      const current = getAdminAuthInfo();
      if (current) setAdminAuthInfo({ ...current, ...data });
      notify.success(ar ? 'تم تحديث الملف' : 'Profile updated');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل التحديث' : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setSaving(true);
    try {
      await api.put('/admin/profile/password', passwords);
      setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' });
      notify.success(ar ? 'تم تغيير كلمة المرور' : 'Password changed');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل تغيير كلمة المرور' : 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7367f0]" /></div>;
  }

  return (
    <div className="page-enter mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">{ar ? 'الملف الشخصي' : 'Profile'}</h2>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'البيانات الشخصية' : 'Personal Info'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormGrid>
            <FormField label={ar ? 'الاسم' : 'Name'}>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'البريد' : 'Email'}>
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الهاتف' : 'Phone'}>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </FormField>
          </FormGrid>
          <Button onClick={saveProfile} disabled={saving}>{ar ? 'حفظ' : 'Save'}</Button>
        </CardContent>
      </Card>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField label={ar ? 'كلمة المرور الحالية' : 'Current password'}>
            <Input type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'كلمة المرور الجديدة' : 'New password'}>
            <Input type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'تأكيد كلمة المرور' : 'Confirm password'}>
            <Input type="password" value={passwords.new_password_confirmation} onChange={(e) => setPasswords({ ...passwords, new_password_confirmation: e.target.value })} />
          </FormField>
          <Button onClick={savePassword} disabled={saving}>{ar ? 'تغيير كلمة المرور' : 'Change password'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
