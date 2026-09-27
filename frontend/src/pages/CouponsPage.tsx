import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { formatCouponSummary, type CouponAppliesTo, type CouponDiscountType } from '../lib/coupon-config';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type CouponRow = {
  id: number;
  code: string;
  name: string;
  type: CouponDiscountType;
  applies_to: CouponAppliesTo;
  value: number;
  usage_limit?: number;
  used_count: number;
  status: string;
  starts_at?: string;
  expires_at?: string;
};

const emptyForm = {
  code: '', name: '', type: 'percentage', applies_to: 'subtotal', value: '', minimum_order_amount: '',
  maximum_discount_amount: '', usage_limit: '', usage_limit_per_customer: '', status: 'active', starts_at: '', expires_at: '',
};

export function CouponsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<CouponRow>[]>(() => [
    {
      key: 'code',
      header: ar ? 'الكود' : 'Code',
      render: (r) => <span className="font-mono font-semibold">{r.code}</span>,
    },
    { key: 'name', header: ar ? 'الاسم' : 'Name', render: (r) => r.name },
    {
      key: 'value',
      header: ar ? 'الخصم' : 'Discount',
      render: (r) => formatCouponSummary(r.applies_to ?? 'subtotal', r.type, r.value, ar),
    },
    { key: 'used', header: ar ? 'الاستخدام' : 'Used', render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => (
      <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge>
    )},
  ], [ar]);

  return (
    <CrudPage<CouponRow>
      title={ar ? 'كوبونات الخصم' : 'Coupons'}
      endpoint="/admin/coupons"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('coupons.create')}
      canUpdate={hasPermission('coupons.update')}
      canDelete={hasPermission('coupons.delete')}
      mapRowToForm={(row) => ({
        code: row.code,
        name: row.name,
        type: row.type === 'free_shipping' ? 'percentage' : row.type,
        applies_to: row.applies_to ?? (row.type === 'free_shipping' ? 'shipping' : 'subtotal'),
        value: String(row.type === 'free_shipping' ? 100 : row.value),
        minimum_order_amount: '',
        maximum_discount_amount: '',
        usage_limit: row.usage_limit ? String(row.usage_limit) : '',
        usage_limit_per_customer: '',
        status: row.status,
        starts_at: row.starts_at ? row.starts_at.slice(0, 16) : '',
        expires_at: row.expires_at ? row.expires_at.slice(0, 16) : '',
      })}
      preparePayload={(form, mode) => ({
        ...(mode === 'create' ? { code: form.code } : {}),
        name: form.name,
        type: form.type,
        applies_to: form.applies_to,
        value: Number(form.value),
        minimum_order_amount: form.minimum_order_amount ? Number(form.minimum_order_amount) : null,
        maximum_discount_amount: form.maximum_discount_amount ? Number(form.maximum_discount_amount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        usage_limit_per_customer: form.usage_limit_per_customer ? Number(form.usage_limit_per_customer) : null,
        status: form.status,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
      })}
      canEditRow={() => true}
      renderForm={(form, setForm, mode) => (
        <FormGrid>
          {mode === 'create' ? (
            <FormField label={ar ? 'كود الكوبون *' : 'Coupon code *'}>
              <Input value={String(form.code || '')} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </FormField>
          ) : null}
          <FormField label={ar ? 'الاسم *' : 'Name *'}>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'يطبّق على *' : 'Applies to *'}>
            <SelectInput
              value={String(form.applies_to || 'subtotal')}
              onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
            >
              <option value="subtotal">{ar ? 'مجموع المنتجات' : 'Order subtotal'}</option>
              <option value="shipping">{ar ? 'رسوم الشحن' : 'Shipping fee'}</option>
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'نوع الخصم *' : 'Discount type *'}>
            <SelectInput value={String(form.type || 'percentage')} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percentage">{ar ? 'نسبة مئوية %' : 'Percentage %'}</option>
              <option value="fixed_amount">{ar ? 'مبلغ ثابت' : 'Fixed amount'}</option>
            </SelectInput>
          </FormField>
          <FormField label={form.type === 'percentage' ? (ar ? 'النسبة *' : 'Percent *') : (ar ? 'المبلغ *' : 'Amount *')}>
            <Input
              type="number"
              step={form.type === 'percentage' ? '1' : '0.01'}
              min={0}
              max={form.type === 'percentage' ? 100 : undefined}
              value={String(form.value || '')}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </FormField>
          {form.type === 'percentage' ? (
            <FormField label={ar ? 'أقصى خصم (اختياري)' : 'Max discount (optional)'}>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={String(form.maximum_discount_amount || '')}
                onChange={(e) => setForm({ ...form, maximum_discount_amount: e.target.value })}
              />
            </FormField>
          ) : null}
          <FormField label={ar ? 'حد أدنى للطلب (اختياري)' : 'Minimum order (optional)'}>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={String(form.minimum_order_amount || '')}
              onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value })}
            />
          </FormField>
          <FormField label={ar ? 'حد الاستخدام' : 'Usage limit'}>
            <Input type="number" value={String(form.usage_limit || '')} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'حد الاستخدام لكل عميل' : 'Per-customer limit'}>
            <Input
              type="number"
              value={String(form.usage_limit_per_customer || '')}
              onChange={(e) => setForm({ ...form, usage_limit_per_customer: e.target.value })}
            />
          </FormField>
          <FormField label={ar ? 'الحالة' : 'Status'}>
            <SelectInput value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">{ar ? 'نشط' : 'Active'}</option>
              <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'يبدأ في' : 'Starts at'}>
            <Input type="datetime-local" value={String(form.starts_at || '')} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'ينتهي في' : 'Expires at'}>
            <Input type="datetime-local" value={String(form.expires_at || '')} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </FormField>
        </FormGrid>
      )}
    />
  );
}
