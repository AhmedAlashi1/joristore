import { useEffect, useMemo, useState } from 'react';
import { CrudPage, FormField, FormGrid, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type PermissionOption = { id: number; name: string; key: string; module: string };

type RoleRow = {
  id: number;
  name: string;
  key: string;
  description?: string;
  is_system: boolean;
  permissions: string[];
};

const emptyForm = {
  name: '',
  key: '',
  description: '',
  permissions: [] as string[],
};

export function RolesPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [permissionGroups, setPermissionGroups] = useState<Record<string, PermissionOption[]>>({});

  useEffect(() => {
    api.get('/admin/permissions/options')
      .then((res) => {
        const items = ensureApiSuccess<Record<string, PermissionOption[]>>(res, '');
        setPermissionGroups(items && typeof items === 'object' ? items : {});
      })
      .catch(() => undefined);
  }, []);

  const columns = useMemo<CrudColumn<RoleRow>[]>(() => [
    {
      key: 'name',
      header: ar ? 'الدور' : 'Role',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description ? <p className="text-xs text-[#8a8da8]">{row.description}</p> : null}
        </div>
      ),
    },
    {
      key: 'key',
      header: ar ? 'المفتاح' : 'Key',
      render: (row) => <code className="text-xs">{row.key}</code>,
    },
    {
      key: 'permissions',
      header: ar ? 'الصلاحيات' : 'Permissions',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.is_system ? (
            <Badge variant="warning">{ar ? 'نظام' : 'System'}</Badge>
          ) : null}
          <span className="text-xs text-[#8a8da8]">{(row.permissions || []).length} {ar ? 'صلاحية' : 'permissions'}</span>
        </div>
      ),
    },
  ], [ar]);

  const togglePermission = (form: Record<string, unknown>, setForm: (next: Record<string, unknown>) => void, key: string) => {
    const current = (form.permissions as string[]) || [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    setForm({ ...form, permissions: next });
  };

  const canManage = hasPermission('roles.manage');

  return (
    <CrudPage<RoleRow>
      title={ar ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}
      endpoint="/admin/roles"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={canManage}
      canUpdate={canManage}
      canDelete={canManage}
      canEditRow={(row) => !row.is_system}
      canDeleteRow={(row) => !row.is_system}
      mapRowToForm={(row) => ({
        name: row.name,
        key: row.key,
        description: row.description ?? '',
        permissions: row.permissions || [],
        is_system: row.is_system,
      })}
      preparePayload={(form, mode) => {
        const payload: Record<string, unknown> = {
          name: form.name,
          description: form.description,
          permissions: form.permissions,
        };
        if (mode === 'create') {
          payload.key = form.key;
        }
        return payload;
      }}
      renderForm={(form, setForm, mode) => (
        <div className="space-y-4">
          <FormGrid>
            <FormField label={ar ? 'اسم الدور *' : 'Role name *'}>
              <Input
                value={String(form.name || '')}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={Boolean(form.is_system)}
              />
            </FormField>
            {mode === 'create' ? (
              <FormField label={ar ? 'المفتاح *' : 'Key *'}>
                <Input
                  value={String(form.key || '')}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="custom_role"
                />
              </FormField>
            ) : null}
            <FormField label={ar ? 'الوصف' : 'Description'}>
              <Input
                value={String(form.description || '')}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={Boolean(form.is_system)}
              />
            </FormField>
          </FormGrid>
          {!form.is_system ? (
            <FormField label={ar ? 'الصلاحيات' : 'Permissions'}>
              <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-white/20 p-3">
                {Object.entries(permissionGroups).map(([module, perms]) => (
                  <div key={module}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8a8da8]">{module}</p>
                    <div className="space-y-1.5">
                      {perms.map((perm) => {
                        const checked = ((form.permissions as string[]) || []).includes(perm.key);
                        return (
                          <label key={perm.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(form, setForm, perm.key)}
                              className="h-4 w-4 accent-[#7367f0]"
                            />
                            <span>{perm.name || perm.key}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </FormField>
          ) : (
            <p className="text-sm text-[#8a8da8]">{ar ? 'أدوار النظام لا يمكن تعديل صلاحياتها' : 'System roles cannot be edited'}</p>
          )}
        </div>
      )}
    />
  );
}
