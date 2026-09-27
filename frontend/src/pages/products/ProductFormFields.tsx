import { FormField, FormGrid, SelectInput } from '../../components/crud/CrudPage';
import { Input } from '../../components/ui/input';
import { AutoEnglishPreview } from '../../components/ui/AutoEnglishPreview';
import { ProductGalleryField } from '../../components/ui/ProductGalleryField';
import type { ProductFormState, ProductOption, SizeRow } from './product-shared';

type ProductFormFieldsProps = {
  form: ProductFormState;
  setForm: (next: ProductFormState) => void;
  categories: ProductOption[];
  brands: ProductOption[];
  ar: boolean;
  readOnly?: boolean;
};

export function ProductFormFields({
  form,
  setForm,
  categories,
  brands,
  ar,
  readOnly = false,
}: ProductFormFieldsProps) {
  const patch = (partial: Partial<ProductFormState>) => setForm({ ...form, ...partial });

  if (readOnly) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="glass-strong space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-bold">{ar ? 'الصور' : 'Images'}</h2>
        <ProductGalleryField
          primary={form.image}
          gallery={form.gallery}
          onChange={({ primary, gallery }) => patch({ image: primary, gallery })}
        />
      </section>

      <section className="glass-strong space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-bold">{ar ? 'البيانات الأساسية' : 'Basics'}</h2>
        <FormGrid>
          <FormField label={ar ? 'اسم المنتج (عربي) *' : 'Product name (Arabic) *'}>
            <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'SKU' : 'SKU'}>
            <Input value={form.sku} onChange={(e) => patch({ sku: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'السعر *' : 'Price *'}>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => patch({ price: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'المخزون' : 'Stock'}>
            <Input type="number" value={String(form.quantity)} onChange={(e) => patch({ quantity: Number(e.target.value) })} />
          </FormField>
          <FormField label={ar ? 'التصنيف' : 'Category'}>
            <SelectInput value={form.category_id} onChange={(e) => patch({ category_id: e.target.value })}>
              <option value="">{ar ? 'بدون' : 'None'}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'الماركة' : 'Brand'}>
            <SelectInput value={form.brand_id} onChange={(e) => patch({ brand_id: e.target.value })}>
              <option value="">{ar ? 'بدون ماركة' : 'No brand'}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'الحالة' : 'Status'}>
            <SelectInput value={form.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="draft">{ar ? 'مسودة' : 'Draft'}</option>
              <option value="active">{ar ? 'نشط' : 'Active'}</option>
              <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
              <option value="archived">{ar ? 'مؤرشف' : 'Archived'}</option>
            </SelectInput>
          </FormField>
          <FormField label={ar ? 'سعر المقارنة' : 'Compare price'}>
            <Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => patch({ compare_at_price: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'التكلفة' : 'Cost'}>
            <Input type="number" step="0.01" value={form.cost} onChange={(e) => patch({ cost: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'رابط (slug)' : 'Slug'}>
            <Input value={form.slug} onChange={(e) => patch({ slug: e.target.value })} placeholder={ar ? 'تلقائي من الاسم' : 'Auto from name'} dir="ltr" />
          </FormField>
        </FormGrid>
      </section>

      <section className="glass-strong space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-bold">{ar ? 'الوصف' : 'Description'}</h2>
        <AutoEnglishPreview
          name_en={form.name_en}
          short_description_en={form.short_description_en}
          description_en={form.description_en}
        />
        <FormField label={ar ? 'وصف مختصر (عربي)' : 'Short description (Arabic)'}>
          <Input value={form.short_description} onChange={(e) => patch({ short_description: e.target.value })} />
        </FormField>
        <FormField label={ar ? 'الوصف (عربي)' : 'Description (Arabic)'}>
          <textarea
            className="glass-input min-h-[120px] w-full rounded-xl px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>
      </section>

      <section className="glass-strong space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-bold">{ar ? 'الألوان والمقاسات' : 'Colors & sizes'}</h2>
        <FormGrid>
          <FormField label={ar ? 'مجموعة الألوان' : 'Color group ID'}>
            <Input value={form.product_group_id} onChange={(e) => patch({ product_group_id: e.target.value.trim() })} dir="ltr" />
          </FormField>
          <FormField label={ar ? 'اسم اللون' : 'Color name'}>
            <Input value={form.color_name} onChange={(e) => patch({ color_name: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'لون العرض' : 'Swatch'}>
            <Input type="color" value={form.color_hex} onChange={(e) => patch({ color_hex: e.target.value })} className="h-10 w-full" />
          </FormField>
        </FormGrid>
        <div className="space-y-2 rounded-xl border border-white/15 p-3 dark:border-white/8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{ar ? 'المقاسات' : 'Sizes'}</p>
            <button
              type="button"
              className="text-xs font-bold text-[#7367f0]"
              onClick={() => patch({ size_variants: [...form.size_variants, { name: '', sku: '', price: '', quantity: 0 }] })}
            >
              + {ar ? 'مقاس' : 'Size'}
            </button>
          </div>
          {form.size_variants.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-4">
              <Input placeholder={ar ? 'مقاس' : 'Size'} value={row.name} onChange={(e) => {
                const list = [...form.size_variants] as SizeRow[];
                list[idx] = { ...list[idx], name: e.target.value };
                patch({ size_variants: list });
              }} />
              <Input placeholder="SKU" value={row.sku} onChange={(e) => {
                const list = [...form.size_variants];
                list[idx] = { ...list[idx], sku: e.target.value };
                patch({ size_variants: list });
              }} />
              <Input type="number" placeholder={ar ? 'كمية' : 'Qty'} value={String(row.quantity)} onChange={(e) => {
                const list = [...form.size_variants];
                list[idx] = { ...list[idx], quantity: Number(e.target.value) };
                patch({ size_variants: list });
              }} />
              <button type="button" className="text-xs text-[#ea5455]" onClick={() => {
                const list = [...form.size_variants];
                list.splice(idx, 1);
                patch({ size_variants: list });
              }}>{ar ? 'حذف' : 'Remove'}</button>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => patch({ featured: e.target.checked })} className="h-4 w-4 accent-[#7367f0]" />
          {ar ? 'منتج مميز' : 'Featured'}
        </label>
      </section>
    </div>
  );
}
