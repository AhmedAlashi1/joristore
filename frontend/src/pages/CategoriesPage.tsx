import { useEffect, useMemo, useState } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { Badge } from '../components/ui/badge';
import { mediaUrl } from '../lib/media';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type CategoryOption = { id: number; name: string; parent_id?: number | null };

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  parent_name?: string;
  description?: string;
  image?: string | null;
  status: string;
  sort_order: number;
};

const emptyForm = { name: '', slug: '', parent_id: '', description: '', image: '', status: 'active', sort_order: 0 };

export function CategoriesPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    api.get('/admin/categories/options').then((res) => {
      setCategories(ensureApiSuccess<CategoryOption[]>(res, '') || []);
    }).catch(() => undefined);
  }, []);

  const columns = useMemo<CrudColumn<CategoryRow>[]>(() => [
    { key: 'name', header: ar ? 'الاسم' : 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: ar ? 'الرابط' : 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
    { key: 'image', header: ar ? 'الصورة' : 'Image', render: (r) => r.image ? <img src={mediaUrl(r.image)} alt="" className="h-10 w-10 rounded-lg object-cover" /> : '—' },
    { key: 'parent', header: ar ? 'التصنيف الأب' : 'Parent', render: (r) => r.parent_name ?? '—' },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
  ], [ar]);

  return (
    <CrudPage<CategoryRow>
      title={ar ? 'التصنيفات' : 'Categories'}
      endpoint="/admin/categories"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('categories.create')}
      canUpdate={hasPermission('categories.update')}
      canDelete={hasPermission('categories.delete')}
      mapRowToForm={(row) => ({
        name: row.name, slug: row.slug, parent_id: row.parent_id ? String(row.parent_id) : '',
        description: row.description ?? '', image: row.image ?? '', status: row.status, sort_order: row.sort_order,
      })}
      preparePayload={(form) => ({
        name: form.name,
        slug: form.slug || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        description: form.description || null,
        image: form.image || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الرابط' : 'Slug'}>
            <Input value={String(form.slug || '')} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" />
          </FormField>
          <FormField label={ar ? 'التصنيف الأب' : 'Parent'}>
            <SelectInput value={String(form.parent_id || '')} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
              <option value="">{ar ? 'بدون' : 'None'}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'الترتيب' : 'Sort order'}>
            <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
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
          <div className="col-span-full">
            <ImageUploadField
              label={ar ? 'صورة القسم' : 'Category image'}
              folder="categories"
              value={String(form.image || '')}
              onChange={(path) => setForm({ ...form, image: path })}
            />
          </div>
        </FormGrid>
      )}
    />
  );
}
