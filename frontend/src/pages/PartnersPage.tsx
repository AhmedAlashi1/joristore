import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type PartnerRow = {
  id: number;
  name: string;
  name_en?: string | null;
  gym_name?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  login_phone?: string;
  status: string;
  default_commission_type?: string | null;
  default_commission_value?: number | null;
};

const emptyForm = {
  name: '', name_en: '', gym_id: '', contact_phone: '', contact_email: '', city: '', notes: '',
  status: 'active', login_phone: '', password: '',
  default_commission_type: 'percentage', default_commission_value: '',
};

const partnerPortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/partner/login` : '/partner/login';

export function PartnersPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<PartnerRow>[]>(() => [
    { key: 'name', header: ar ? 'الشريك' : 'Partner', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'login', header: ar ? 'جوال الدخول' : 'Login phone', render: (r) => <span dir="ltr" className="font-mono text-sm">{r.login_phone ?? '—'}</span> },
    {
      key: 'commission',
      header: ar ? 'نسبة الربح' : 'Commission',
      render: (r) => {
        if (!r.default_commission_type || r.default_commission_value == null) return '—';
        return r.default_commission_type === 'percentage'
          ? `${r.default_commission_value}%`
          : `${r.default_commission_value} ₪`;
      },
    },
    { key: 'city', header: ar ? 'المدينة' : 'City', render: (r) => r.city || '—' },
    { key: 'gym', header: ar ? 'الجيم' : 'Gym', render: (r) => r.gym_name || '—' },
    {
      key: 'status',
      header: ar ? 'الحالة' : 'Status',
      render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge>,
    },
  ], [ar]);

  return (
    <>
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 -mt-2">
      {ar ? 'دخول الشريك للوحة: ' : 'Partner portal login: '}
      <a href={partnerPortalUrl} className="text-emerald-700 underline font-mono" dir="ltr">{partnerPortalUrl}</a>
      {ar ? ' — بنفس جوال الدخول وكلمة المرور اللي حطيتهم هون.' : ' — use the portal phone and password from this form.'}
    </p>
    <CrudPage<PartnerRow>
      title={ar ? 'الشركاء' : 'Partners'}
      endpoint="/admin/partners"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('partners.manage')}
      canUpdate={hasPermission('partners.manage')}
      canDelete={hasPermission('partners.manage')}
      mapRowToForm={(row) => ({
        name: row.name,
        name_en: row.name_en ?? '',
        gym_id: '',
        contact_phone: row.contact_phone ?? '',
        contact_email: '',
        city: row.city ?? '',
        notes: '',
        status: row.status,
        login_phone: row.login_phone ?? '',
        password: '',
        default_commission_type: row.default_commission_type || 'percentage',
        default_commission_value: row.default_commission_value != null ? String(row.default_commission_value) : '',
      })}
      preparePayload={(form, mode) => ({
        name: form.name,
        name_en: form.name_en || null,
        gym_id: form.gym_id ? Number(form.gym_id) : null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        city: form.city || null,
        notes: form.notes || null,
        status: form.status,
        default_commission_type: form.default_commission_value ? form.default_commission_type : null,
        default_commission_value: form.default_commission_value ? Number(form.default_commission_value) : null,
        ...(mode === 'create' ? { login_phone: form.login_phone, password: form.password } : {}),
        ...(mode === 'edit' && form.login_phone ? { login_phone: form.login_phone } : {}),
        ...(mode === 'edit' && form.password ? { password: form.password } : {}),
      })}
      renderForm={(form, setForm, mode) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الاسم (EN)' : 'Name (EN)'}>
            <Input value={String(form.name_en || '')} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'جوال التواصل' : 'Contact phone'}>
            <Input value={String(form.contact_phone || '')} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} dir="ltr" />
          </FormField>
          <FormField label={ar ? 'المدينة' : 'City'}>
            <Input value={String(form.city || '')} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'نسبة ربح الشريك (افتراضي)' : 'Default partner commission'}>
            <div className="flex gap-2 flex-wrap">
              <SelectInput
                value={String(form.default_commission_type || 'percentage')}
                onChange={(e) => setForm({ ...form, default_commission_type: e.target.value })}
              >
                <option value="percentage">{ar ? 'نسبة %' : 'Percent %'}</option>
                <option value="fixed_amount">{ar ? 'مبلغ ثابت' : 'Fixed'}</option>
              </SelectInput>
              <Input
                type="number"
                className="flex-1 min-w-[120px]"
                step={form.default_commission_type === 'percentage' ? '1' : '0.01'}
                min={0}
                max={form.default_commission_type === 'percentage' ? 100 : undefined}
                placeholder={ar ? 'مثلاً 10' : 'e.g. 10'}
                value={String(form.default_commission_value || '')}
                onChange={(e) => setForm({ ...form, default_commission_value: e.target.value })}
              />
            </div>
          </FormField>
          <FormField label={ar ? 'جوال لوحة الشريك *' : 'Portal login phone *'}>
            <Input value={String(form.login_phone || '')} onChange={(e) => setForm({ ...form, login_phone: e.target.value })} dir="ltr" />
          </FormField>
          <FormField label={mode === 'create' ? (ar ? 'كلمة المرور *' : 'Password *') : (ar ? 'كلمة مرور جديدة' : 'New password')}>
            <Input type="password" value={String(form.password || '')} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الحالة' : 'Status'}>
            <SelectInput value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">{ar ? 'نشط' : 'Active'}</option>
              <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
            </SelectInput>
          </FormField>
        </FormGrid>
      )}
    />
    </>
  );
}
