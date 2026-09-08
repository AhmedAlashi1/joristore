import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type BrandRow = { id: number; name: string; slug: string; description?: string; status: string };

const emptyForm = { name: '', slug: '', description: '', status: 'active' };

export function BrandsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<BrandRow>[]>(() => [
    { key: 'name', header: ar ? 'الاسم' : 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: ar ? 'الرابط' : 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
  ], [ar]);

  return (
    <CrudPage<BrandRow>
      title={ar ? 'الماركات' : 'Brands'}
      endpoint="/admin/brands"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('brands.create')}
      canUpdate={hasPermission('brands.update')}
      canDelete={hasPermission('brands.delete')}
      mapRowToForm={(row) => ({ name: row.name, slug: row.slug, description: row.description ?? '', status: row.status })}
      preparePayload={(form) => ({
        name: form.name, slug: form.slug || undefined, description: form.description || null, status: form.status,
      })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الرابط' : 'Slug'}>
            <Input value={String(form.slug || '')} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الحالة' : 'Status'}>
            <SelectInput value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">{ar ? 'نشط' : 'Active'}</option>
              <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'الوصف' : 'Description'}>
            <Input value={String(form.description || '')} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
        </FormGrid>
      )}
    />
  );
}
