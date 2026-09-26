import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type RegionRow = {
  id: number;
  name: string;
  name_en?: string | null;
  slug: string;
  price: number;
  sort_order: number;
  status: string;
};

const emptyForm = {
  name: '',
  name_en: '',
  slug: '',
  price: '0',
  sort_order: '0',
  status: 'active',
};

export function DeliveryRegionsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<RegionRow>[]>(() => [
    { key: 'name', header: ar ? 'المنطقة' : 'Region', render: (r) => r.name },
    { key: 'price', header: ar ? 'رسوم التوصيل (₪)' : 'Delivery fee (₪)', render: (r) => r.price.toFixed(0) },
    { key: 'sort_order', header: ar ? 'الترتيب' : 'Sort', render: (r) => String(r.sort_order ?? 0) },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => r.status },
  ], [ar]);

  return (
    <CrudPage<RegionRow>
      title={ar ? 'مناطق التوصيل' : 'Delivery regions'}
      endpoint="/admin/delivery-regions"
      columns={columns}
      emptyForm={emptyForm}
      extraFilters={
        <p className="mb-1 max-w-3xl text-sm leading-relaxed text-[#6f6b7d] dark:text-[#b6b8cc]">
          {ar
            ? 'سعر التوصيل يُحسب حسب المنطقة فقط. عدّل الأسعار بالشيكل كما تريد.'
            : 'Delivery fee is based on the region only. Prices are in shekels (₪).'}
        </p>
      }
      canCreate={hasPermission('shipping.manage')}
      canUpdate={hasPermission('shipping.manage')}
      canDelete={hasPermission('shipping.manage')}
      mapRowToForm={(row) => ({
        name: row.name,
        name_en: row.name_en ?? '',
        slug: row.slug,
        price: String(row.price),
        sort_order: String(row.sort_order ?? 0),
        status: row.status,
      })}
      preparePayload={(form) => ({
        name: form.name,
        name_en: form.name_en || null,
        slug: form.slug || undefined,
        price: Number(form.price) || 0,
        sort_order: Number(form.sort_order) || 0,
        status: form.status,
      })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم (عربي) *' : 'Name (AR) *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الاسم (EN)' : 'Name (EN)'}>
            <Input value={String(form.name_en || '')} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'Slug' : 'Slug'}>
            <Input value={String(form.slug || '')} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'رسوم التوصيل (₪) *' : 'Delivery fee (₪) *'}>
            <Input type="number" step="1" min="0" value={String(form.price || '')} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الترتيب' : 'Sort'}>
            <Input type="number" value={String(form.sort_order || '')} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الحالة' : 'Status'}>
            <select className="glass-input w-full rounded-xl px-3 py-2 text-sm" value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">{ar ? 'فعّال' : 'Active'}</option>
              <option value="inactive">{ar ? 'معطّل' : 'Inactive'}</option>
            </select>
          </FormField>
        </FormGrid>
      )}
    />
  );
}
