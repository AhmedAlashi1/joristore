import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { Badge } from '../components/ui/badge';
import { mediaUrl } from '../lib/media';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type BannerRow = {
  id: number;
  title: string;
  title_en?: string | null;
  image: string;
  link?: string | null;
  sort_order: number;
  status: string;
};

const emptyForm = {
  title: '', title_en: '', image: '', link: '/shop', sort_order: 0, status: 'active',
};

export function BannersPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<BannerRow>[]>(() => [
    {
      key: 'image',
      header: ar ? 'الصورة' : 'Image',
      render: (r) => (
        <img src={mediaUrl(r.image)} alt={r.title} className="h-14 w-28 rounded-lg object-cover" />
      ),
    },
    { key: 'title', header: ar ? 'العنوان' : 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'title_en', header: ar ? 'العنوان (EN)' : 'Title (EN)', render: (r) => r.title_en || '—' },
    { key: 'link', header: ar ? 'الرابط' : 'Link', render: (r) => <code className="text-xs">{r.link || '—'}</code> },
    { key: 'sort', header: ar ? 'الترتيب' : 'Order', render: (r) => r.sort_order },
    {
      key: 'status',
      header: ar ? 'الحالة' : 'Status',
      render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge>,
    },
  ], [ar]);

  return (
    <CrudPage<BannerRow>
      title={ar ? 'البنرات الإعلانية' : 'Promo Banners'}
      endpoint="/admin/promo-banners"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('banners.create')}
      canUpdate={hasPermission('banners.update')}
      canDelete={hasPermission('banners.delete')}
      mapRowToForm={(row) => ({
        title: row.title,
        title_en: row.title_en ?? '',
        image: row.image,
        link: row.link ?? '',
        sort_order: row.sort_order,
        status: row.status,
      })}
      preparePayload={(form) => ({
        title: form.title,
        title_en: form.title_en || null,
        image: form.image,
        link: form.link || null,
        sort_order: Number(form.sort_order) || 0,
        status: form.status,
      })}
      renderForm={(form, setForm) => (
        <FormGrid>
          <FormField label={ar ? 'العنوان (عربي) *' : 'Title (Arabic) *'}>
            <Input value={String(form.title || '')} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'العنوان (English)' : 'Title (English)'}>
            <Input value={String(form.title_en || '')} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" />
          </FormField>
          <div className="col-span-full">
            <ImageUploadField
              label={ar ? 'صورة البنر *' : 'Banner image *'}
              folder="banners"
              value={String(form.image || '')}
              onChange={(path) => setForm({ ...form, image: path })}
            />
          </div>
          <FormField label={ar ? 'رابط عند الضغط' : 'Click link'}>
            <Input
              value={String(form.link || '')}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/shop"
              dir="ltr"
            />
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
        </FormGrid>
      )}
    />
  );
}
