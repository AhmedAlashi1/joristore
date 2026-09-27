import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';
import { ProductFormFields } from './ProductFormFields';
import { ProductPageHeader } from './ProductPageHeader';
import { emptyProductForm, prepareProductPayload, type ProductRecord } from './product-shared';
import { useProductOptions } from './useProductOptions';

export function ProductCreatePage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const navigate = useNavigate();
  const { categories, brands } = useProductOptions();
  const [form, setForm] = useState(emptyProductForm());
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.price) {
      notify.error(ar ? 'الاسم والسعر مطلوبان' : 'Name and price are required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/admin/products', prepareProductPayload(form));
      const created = ensureApiSuccess<ProductRecord>(res, '');
      notify.success(ar ? 'تم إنشاء المنتج' : 'Product created');
      navigate(`/admin/products/${created.id}`);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter space-y-4 pb-24">
      <ProductPageHeader
        title={ar ? 'منتج جديد' : 'New product'}
        subtitle={ar ? 'املأ البيانات بالعربي — الإنجليزي يُترجم تلقائياً' : 'Fill in Arabic — English is auto-translated'}
      />
      <ProductFormFields form={form} setForm={setForm} categories={categories} brands={brands} ar={ar} />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-[#f8f8fb]/95 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#1a1d2e]/95 md:ms-[270px]">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {ar ? 'حفظ المنتج' : 'Save product'}
          </Button>
        </div>
      </div>
    </div>
  );
}
