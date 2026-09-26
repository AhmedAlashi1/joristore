import { useEffect, useMemo, useState } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { Badge } from '../components/ui/badge';
import { mediaUrl } from '../lib/media';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { formatPrice } from '../lib/format-price';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type Option = { id: number; name: string };

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  category_id?: number | null;
  category_name?: string;
  brand_id?: number | null;
  brand_name?: string;
  price: number;
  quantity: number;
  sku?: string;
  featured: boolean;
  short_description?: string;
  description?: string;
  compare_at_price?: number;
  cost?: number;
  image?: string | null;
  product_group_id?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_variants?: Array<{ name: string; sku?: string; price?: number; quantity: number }>;
};

type SizeRow = { name: string; sku: string; price: string; quantity: number };

const emptyForm = {
  name: '', slug: '', category_id: '', brand_id: '', status: 'draft',
  short_description: '', description: '', sku: '', price: '', compare_at_price: '', cost: '', quantity: 0, featured: false, image: '',
  product_group_id: '', color_name: '', color_hex: '#7367f0', size_variants: [] as SizeRow[],
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  active: 'success', draft: 'warning', inactive: 'destructive', archived: 'destructive',
};

export function ProductsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/categories/options'),
      api.get('/admin/brands/options'),
    ]).then(([catRes, brandRes]) => {
      setCategories(ensureApiSuccess<Option[]>(catRes, '') || []);
      setBrands(ensureApiSuccess<Option[]>(brandRes, '') || []);
    }).catch(() => undefined);
  }, []);

  const columns = useMemo<CrudColumn<ProductRow>[]>(() => [
    {
      key: 'image',
      header: ar ? 'الصورة' : 'Image',
      render: (r) => r.image
        ? <img src={mediaUrl(r.image)} alt={r.name} className="h-11 w-11 rounded-lg object-cover" />
        : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#7367f0]/10 text-sm font-bold text-[#7367f0]">{r.name.charAt(0)}</span>,
    },
    {
      key: 'name',
      header: ar ? 'المنتج' : 'Product',
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-[#8a8da8]">{r.sku ?? r.slug}</p>
        </div>
      ),
    },
    { key: 'category', header: ar ? 'التصنيف' : 'Category', render: (r) => r.category_name ?? '—' },
    { key: 'price', header: ar ? 'السعر' : 'Price', render: (r) => formatPrice(r.price) },
    { key: 'quantity', header: ar ? 'المخزون' : 'Stock', render: (r) => (
      <span className={r.quantity <= 5 ? 'font-semibold text-[#ff9f43]' : ''}>{r.quantity}</span>
    )},
    { key: 'status', header: ar ? 'الحالة' : 'Status', render: (r) => <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status}</Badge> },
  ], [ar]);

  return (
    <CrudPage<ProductRow>
      title={ar ? 'المنتجات' : 'Products'}
      endpoint="/admin/products"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('products.create')}
      canUpdate={hasPermission('products.update')}
      canDelete={hasPermission('products.delete')}
      canDuplicate={hasPermission('products.create')}
      duplicateLabel={ar ? 'نسخ — غيّر اللون فقط' : 'Copy — change color only'}
      mapRowToForm={(row) => ({
        name: row.name, slug: row.slug,
        category_id: row.category_id ? String(row.category_id) : '',
        brand_id: row.brand_id ? String(row.brand_id) : '',
        status: row.status, short_description: row.short_description ?? '',
        description: row.description ?? '', sku: row.sku ?? '', price: String(row.price),
        compare_at_price: row.compare_at_price != null ? String(row.compare_at_price) : '',
        cost: row.cost != null ? String(row.cost) : '',
        quantity: row.quantity, featured: row.featured, image: row.image ?? '',
        product_group_id: row.product_group_id ?? '',
        color_name: row.color_name ?? '',
        color_hex: row.color_hex ?? '#7367f0',
        size_variants: (row.size_variants ?? []).map((v) => ({
          name: v.name,
          sku: v.sku ?? '',
          price: v.price != null ? String(v.price) : '',
          quantity: v.quantity ?? 0,
        })),
      })}
      preparePayload={(form) => {
        const sizeRows = (form.size_variants as SizeRow[] | undefined)?.filter((r) => r.name?.trim()) ?? [];
        return {
          name: form.name,
          slug: form.slug || undefined,
          category_id: form.category_id ? Number(form.category_id) : null,
          brand_id: form.brand_id ? Number(form.brand_id) : null,
          status: form.status,
          short_description: form.short_description || null,
          description: form.description || null,
          sku: form.sku || null,
          price: Number(form.price),
          compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
          cost: form.cost ? Number(form.cost) : null,
          quantity: Number(form.quantity) || 0,
          featured: Boolean(form.featured),
          image: form.image || null,
          product_group_id: (() => {
            const id = String(form.product_group_id ?? '').trim();
            return id.length > 0 ? id : null;
          })(),
          color_name: form.color_name || null,
          color_hex: form.color_hex || null,
          size_variants: sizeRows.length
            ? sizeRows.map((r) => ({
              name: r.name.trim(),
              sku: r.sku || null,
              price: r.price ? Number(r.price) : undefined,
              quantity: Number(r.quantity) || 0,
            }))
            : undefined,
        };
      }}
      renderForm={(form, setForm) => (
        <div className="space-y-4">
          <ImageUploadField
            label={ar ? 'صورة المنتج' : 'Product image'}
            folder="products"
            value={String(form.image || '')}
            onChange={(path) => setForm({ ...form, image: path })}
          />
          <FormGrid>
            <FormField label={ar ? 'اسم المنتج *' : 'Product name *'}>
              <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'SKU' : 'SKU'}>
              <Input value={String(form.sku || '')} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'السعر *' : 'Price *'}>
              <Input type="number" step="0.01" value={String(form.price || '')} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'المخزون' : 'Stock'}>
              <Input type="number" value={String(form.quantity ?? 0)} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </FormField>
            <FormField label={ar ? 'التصنيف' : 'Category'}>
              <SelectInput value={String(form.category_id || '')} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">{ar ? 'بدون' : 'None'}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectInput>
            </FormField>
            <FormField label={ar ? 'الماركة (اختياري)' : 'Brand (optional)'}>
              <SelectInput value={String(form.brand_id || '')} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">{ar ? 'بدون ماركة' : 'No brand'}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </SelectInput>
            </FormField>
            <FormField label={ar ? 'الحالة' : 'Status'}>
              <SelectInput value={String(form.status || 'draft')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">{ar ? 'مسودة' : 'Draft'}</option>
                <option value="active">{ar ? 'نشط' : 'Active'}</option>
                <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
                <option value="archived">{ar ? 'مؤرشف' : 'Archived'}</option>
              </SelectInput>
            </FormField>
            <FormField label={ar ? 'سعر المقارنة' : 'Compare price'}>
              <Input type="number" step="0.01" value={String(form.compare_at_price || '')} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} />
            </FormField>
          </FormGrid>
          <FormField label={ar ? 'وصف مختصر' : 'Short description'}>
            <Input value={String(form.short_description || '')} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الوصف' : 'Description'}>
            <textarea
              className="glass-input min-h-[100px] w-full rounded-xl px-3 py-2 text-sm"
              value={String(form.description || '')}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <FormGrid>
            <FormField label={ar ? 'مجموعة الألوان (اختياري)' : 'Color group (optional)'}>
              <Input
                value={String(form.product_group_id || '')}
                onChange={(e) => setForm({ ...form, product_group_id: e.target.value.trim() })}
                dir="ltr"
                placeholder="550e8400-e29b-41d4-a716-446655440000"
              />
              <p className="text-xs text-[#8a8da8]">
                {ar ? 'اتركه فارغاً — يُنشأ تلقائياً عند إضافة اسم لون. للون ثانٍ: انسخ القيمة من المنتج الأول.' : 'Leave empty to auto-create when color name is set. For another color: paste the same ID from the first product.'}
              </p>
            </FormField>
            <FormField label={ar ? 'اسم اللون' : 'Color name'}>
              <Input value={String(form.color_name || '')} onChange={(e) => setForm({ ...form, color_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'لون العرض' : 'Color swatch'}>
              <Input type="color" value={String(form.color_hex || '#7367f0')} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} className="h-10 w-full" />
            </FormField>
          </FormGrid>
          <div className="space-y-2 rounded-xl border border-white/15 p-3 dark:border-white/8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{ar ? 'المقاسات والمخزون' : 'Sizes & stock'}</p>
              <button
                type="button"
                className="text-xs font-bold text-[#7367f0]"
                onClick={() => {
                  const list = [...((form.size_variants as SizeRow[]) || [])];
                  list.push({ name: '', sku: '', price: '', quantity: 0 });
                  setForm({ ...form, size_variants: list });
                }}
              >
                + {ar ? 'مقاس' : 'Size'}
              </button>
            </div>
            {((form.size_variants as SizeRow[]) || []).map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-4">
                <Input placeholder={ar ? 'مقاس' : 'Size'} value={row.name} onChange={(e) => {
                  const list = [...((form.size_variants as SizeRow[]) || [])];
                  list[idx] = { ...list[idx], name: e.target.value };
                  setForm({ ...form, size_variants: list });
                }} />
                <Input placeholder="SKU" value={row.sku} onChange={(e) => {
                  const list = [...((form.size_variants as SizeRow[]) || [])];
                  list[idx] = { ...list[idx], sku: e.target.value };
                  setForm({ ...form, size_variants: list });
                }} />
                <Input type="number" placeholder={ar ? 'كمية' : 'Qty'} value={String(row.quantity)} onChange={(e) => {
                  const list = [...((form.size_variants as SizeRow[]) || [])];
                  list[idx] = { ...list[idx], quantity: Number(e.target.value) };
                  setForm({ ...form, size_variants: list });
                }} />
                <button type="button" className="text-xs text-[#ea5455]" onClick={() => {
                  const list = [...((form.size_variants as SizeRow[]) || [])];
                  list.splice(idx, 1);
                  setForm({ ...form, size_variants: list });
                }}>{ar ? 'حذف' : 'Remove'}</button>
              </div>
            ))}
            <p className="text-xs text-[#8a8da8]">{ar ? 'كل لون = منتج منفصل بنفس product_group. اترك المقاسات فارغة للمنتج بدون مقاسات.' : 'One product per color; link with product_group_id. Leave sizes empty for simple products.'}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 accent-[#7367f0]" />
            {ar ? 'منتج مميز' : 'Featured product'}
          </label>
        </div>
      )}
    />
  );
}
