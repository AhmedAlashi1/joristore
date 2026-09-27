import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';
import { ProductFormFields } from './ProductFormFields';
import { ProductPageHeader } from './ProductPageHeader';
import { emptyProductForm, mapProductToForm, prepareProductPayload, type ProductRecord } from './product-shared';
import { useProductOptions } from './useProductOptions';

export function ProductEditPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const navigate = useNavigate();
  const { categories, brands } = useProductOptions();
  const [form, setForm] = useState(emptyProductForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/admin/products/${id}`)
      .then((res) => {
        const data = ensureApiSuccess<ProductRecord>(res, '');
        setForm(mapProductToForm(data));
        setTitle(data.name);
      })
      .catch(() => navigate('/admin/products'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const save = async () => {
    if (!id || !form.name.trim()) {
      notify.error(ar ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/products/${id}`, prepareProductPayload(form));
      notify.success(ar ? 'تم التحديث' : 'Updated');
      navigate(`/admin/products/${id}`);
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-4 pb-24">
      <ProductPageHeader
        title={ar ? `تعديل: ${title}` : `Edit: ${title}`}
        backTo={`/admin/products/${id}`}
        backLabel={ar ? 'عرض المنتج' : 'View product'}
        actions={(
          <Link to={`/admin/products/${id}`} className={cn(buttonVariants({ variant: 'secondary' }))}>
            {ar ? 'معاينة' : 'Preview'}
          </Link>
        )}
      />
      <ProductFormFields form={form} setForm={setForm} categories={categories} brands={brands} ar={ar} />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-[#f8f8fb]/95 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#1a1d2e]/95 md:ms-[270px]">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(`/admin/products/${id}`)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {ar ? 'حفظ التعديلات' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
