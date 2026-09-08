import { useEffect, useMemo, useState } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type RoleOption = { id: number; name: string; key: string };

type StaffRow = {
  id: number;
  status: string;
  role_id: number;
  role?: string;
  role_key?: string;
  is_owner: boolean;
  user: { id: number; name: string; email: string; phone?: string };
  joined_at?: string;
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
};

export function AdminsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    api.get('/admin/staff/roles/options')
      .then((res) => {
        const items = ensureApiSuccess<RoleOption[]>(res, '');
        setRoles(Array.isArray(items) ? items : []);
      })
      .catch(() => undefined);
  }, []);

  const columns = useMemo<CrudColumn<StaffRow>[]>(() => [
    {
      key: 'name',
      header: ar ? 'الموظف' : 'Staff',
      render: (row) => (
        <div>
          <p className="font-medium">{row.user.name}</p>
          <p className="text-xs text-[#8a8da8]">{row.user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: ar ? 'الدور' : 'Role',
      render: (row) => (
        <Badge variant={row.is_owner ? 'default' : 'success'}>{row.role ?? row.role_key}</Badge>
      ),
    },
    {
      key: 'status',
      header: ar ? 'الحالة' : 'Status',
      render: (row) => <span className="text-sm capitalize">{row.status}</span>,
    },
  ], [ar]);

  return (
    <CrudPage<StaffRow>
      title={ar ? 'الموظفون' : 'Staff'}
      endpoint="/admin/staff"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('staff.invite')}
      canUpdate={hasPermission('staff.update')}
      canDelete={hasPermission('staff.remove')}
      canEditRow={(row) => !row.is_owner}
      canDeleteRow={(row) => !row.is_owner}
      mapRowToForm={(row) => ({
        name: row.user.name,
        email: row.user.email,
        phone: row.user.phone ?? '',
        password: '',
        role_id: String(row.role_id),
        status: row.status,
        is_owner: row.is_owner,
      })}
      preparePayload={(form, mode) => {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role_id: Number(form.role_id),
        };
        if (mode === 'create' || form.password) {
          payload.password = form.password;
        }
        if (mode === 'edit' && form.status) {
          payload.status = form.status;
        }
        return payload;
      }}
      renderForm={(form, setForm, mode) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'البريد *' : 'Email *'}>
            <Input
              value={String(form.email || '')}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={mode === 'edit'}
            />
          </FormField>
          <FormField label={ar ? 'الهاتف' : 'Phone'}>
            <Input value={String(form.phone || '')} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label={mode === 'create' ? (ar ? 'كلمة المرور *' : 'Password *') : (ar ? 'كلمة المرور' : 'Password')}>
            <Input
              type="password"
              value={String(form.password || '')}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={mode === 'edit' ? (ar ? 'اتركه فارغاً بدون تغيير' : 'Leave blank to keep current') : ''}
            />
          </FormField>
          <FormField label={ar ? 'الدور *' : 'Role *'}>
            <SelectInput
              value={String(form.role_id || '')}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              disabled={Boolean(form.is_owner)}
            >
              <option value="">{ar ? 'اختر دوراً' : 'Select role'}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </SelectInput>
          </FormField>
          {mode === 'edit' && !form.is_owner ? (
            <FormField label={ar ? 'الحالة' : 'Status'}>
              <SelectInput
                value={String(form.status || 'active')}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">{ar ? 'نشط' : 'Active'}</option>
                <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
                <option value="suspended">{ar ? 'موقوف' : 'Suspended'}</option>
              </SelectInput>
            </FormField>
          ) : null}
        </FormGrid>
      )}
    />
  );
}
