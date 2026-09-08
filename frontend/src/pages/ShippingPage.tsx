import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type ShippingRow = {
  id: number;
  name: string;
  type: string;
  price: number;
  estimated_days_min?: number;
  estimated_days_max?: number;
  status: string;
};

const emptyForm = {
  name: '', type: 'flat_rate', price: '0', estimated_days_min: '', estimated_days_max: '', status: 'active',
};

export function ShippingPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<ShippingRow>[]>(() => [
    { key: 'name', header: ar ? 'الاسم' : 'Name', render: (r) => r.name },
    { key: 'type', header: ar ? 'النوع' : 'Type', render: (r) => r.type },
    { key: 'price', header: ar ? 'السعر' : 'Price', render: (r) => r.type === 'free' ? (ar ? 'مجاني' : 'Free') : `${r.price.toFixed(2)} SAR` },
    {
      key: 'days',
      header: ar ? 'مدة التوصيل' : 'Delivery',
      render: (r) => {
        if (r.estimated_days_min && r.estimated_days_max) return `${r.estimated_days_min}-${r.estimated_days_max} ${ar ? 'يوم' : 'days'}`;
        return '—';
      },
    },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => (
      <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge>
    )},
  ], [ar]);

  return (
    <CrudPage<ShippingRow>
      title={ar ? 'طرق الشحن' : 'Shipping Methods'}
      endpoint="/admin/shipping-methods"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('shipping.manage')}
      canUpdate={hasPermission('shipping.manage')}
      canDelete={hasPermission('shipping.manage')}
      mapRowToForm={(row) => ({
        name: row.name, type: row.type, price: String(row.price),
        estimated_days_min: row.estimated_days_min ? String(row.estimated_days_min) : '',
        estimated_days_max: row.estimated_days_max ? String(row.estimated_days_max) : '',
        status: row.status,
      })}
      preparePayload={(form) => ({
        name: form.name,
        type: form.type,
        price: Number(form.price) || 0,
        estimated_days_min: form.estimated_days_min ? Number(form.estimated_days_min) : null,
        estimated_days_max: form.estimated_days_max ? Number(form.estimated_days_max) : null,
        status: form.status,
      })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'النوع *' : 'Type *'}>
            <SelectInput value={String(form.type || 'flat_rate')} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="flat_rate">{ar ? 'سعر ثابت' : 'Flat rate'}</option>
              <option value="free">{ar ? 'مجاني' : 'Free'}</option>
              <option value="pickup">{ar ? 'استلام' : 'Pickup'}</option>
              <option value="provider">{ar ? 'مزود خارجي' : 'Provider'}</option>
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'السعر' : 'Price'}>
            <Input type="number" step="0.01" value={String(form.price || '')} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'أقل مدة (أيام)' : 'Min days'}>
            <Input type="number" value={String(form.estimated_days_min || '')} onChange={(e) => setForm({ ...form, estimated_days_min: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'أقصى مدة (أيام)' : 'Max days'}>
            <Input type="number" value={String(form.estimated_days_max || '')} onChange={(e) => setForm({ ...form, estimated_days_max: e.target.value })} />
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
  );
}
