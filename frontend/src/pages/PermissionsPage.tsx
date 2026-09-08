import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type PermissionRow = {
  id: number;
  name: string;
  guard_name: string;
};

const emptyForm = {
  name: '',
};

export function PermissionsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<PermissionRow>[]>(() => [
    {
      key: 'name',
      header: ar ? 'الصلاحية' : 'Permission',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'guard_name',
      header: ar ? 'الحارس' : 'Guard',
      render: (row) => <span className="text-[#8a8da8]">{row.guard_name}</span>,
    },
  ], [ar]);

  return (
    <CrudPage<PermissionRow>
      title={ar ? 'الصلاحيات' : 'Permissions'}
      endpoint="/admin/permissions"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('permissions.create')}
      canUpdate={hasPermission('permissions.update')}
      canDelete={hasPermission('permissions.delete')}
      mapRowToForm={(row) => ({ name: row.name })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'اسم الصلاحية *' : 'Permission name *'}>
            <Input
              value={String(form.name || '')}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="admins.view"
            />
          </FormField>
        </FormGrid>
      )}
    />
  );
}
