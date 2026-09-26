import { useMemo } from 'react';
import { CrudPage, FormField, FormGrid, SelectInput, type CrudColumn } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { Badge } from '../components/ui/badge';
import { mediaUrl } from '../lib/media';
import { hasPermission } from '../lib/auth';
import { useI18n } from '../providers/i18n-provider';

type GymRow = {
  id: number;
  name: string;
  name_en?: string | null;
  sector?: string | null;
  city?: string | null;
  cover_image?: string | null;
  gallery?: string[];
  description?: string | null;
  subscription_info?: string | null;
  opening_hours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  status: string;
  sort_order: number;
};

const defaultHours = {
  sun: { open: '06:00', close: '22:00', closed: false },
  mon: { open: '06:00', close: '22:00', closed: false },
  tue: { open: '06:00', close: '22:00', closed: false },
  wed: { open: '06:00', close: '22:00', closed: false },
  thu: { open: '06:00', close: '22:00', closed: false },
  fri: { open: '14:00', close: '22:00', closed: false },
  sat: { open: '08:00', close: '20:00', closed: false },
};

const emptyForm = {
  name: '', name_en: '', sector: '', city: '', latitude: '', longitude: '',
  cover_image: '', gallery: [] as string[], description: '', subscription_info: '',
  opening_hours: defaultHours, status: 'active', sort_order: 0,
};

export function GymsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';

  const columns = useMemo<CrudColumn<GymRow>[]>(() => [
    {
      key: 'cover',
      header: ar ? 'الصورة' : 'Cover',
      render: (r) => r.cover_image
        ? <img src={mediaUrl(r.cover_image)} alt={r.name} className="h-12 w-16 rounded-lg object-cover" />
        : '—',
    },
    { key: 'name', header: ar ? 'الجيم' : 'Gym', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'sector', header: ar ? 'القطاع' : 'Sector', render: (r) => r.sector || '—' },
    { key: 'city', header: ar ? 'المدينة' : 'City', render: (r) => r.city || '—' },
    {
      key: 'status',
      header: ar ? 'الحالة' : 'Status',
      render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge>,
    },
  ], [ar]);

  return (
    <CrudPage<GymRow>
      title={ar ? 'الجيمات' : 'Gyms'}
      endpoint="/admin/gyms"
      columns={columns}
      emptyForm={emptyForm}
      canCreate={hasPermission('settings.update')}
      canUpdate={hasPermission('settings.update')}
      canDelete={hasPermission('settings.update')}
      mapRowToForm={(row) => ({
        name: row.name,
        name_en: row.name_en ?? '',
        sector: row.sector ?? '',
        city: row.city ?? '',
        latitude: '',
        longitude: '',
        cover_image: row.cover_image ?? '',
        gallery: row.gallery ?? [],
        description: row.description ?? '',
        subscription_info: row.subscription_info ?? '',
        opening_hours: row.opening_hours ?? defaultHours,
        status: row.status,
        sort_order: row.sort_order,
      })}
      preparePayload={(form) => ({
        name: form.name,
        name_en: form.name_en || null,
        sector: form.sector || null,
        city: form.city || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        cover_image: form.cover_image || null,
        gallery: form.gallery || [],
        description: form.description || null,
        subscription_info: form.subscription_info || null,
        opening_hours: form.opening_hours || defaultHours,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      })}
      renderForm={(form, setForm) => (
        <div className="space-y-4">
          <ImageUploadField
            label={ar ? 'صورة الغلاف' : 'Cover image'}
            folder="banners"
            value={String(form.cover_image || '')}
            onChange={(path) => setForm({ ...form, cover_image: path })}
          />
          <FormGrid>
            <FormField label={ar ? 'اسم الجيم *' : 'Gym name *'}>
              <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الاسم (EN)' : 'Name (EN)'}>
              <Input value={String(form.name_en || '')} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label={ar ? 'القطاع' : 'Sector'}>
              <Input value={String(form.sector || '')} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'المدينة' : 'City'}>
              <Input value={String(form.city || '')} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'Latitude' : 'Latitude'}>
              <Input value={String(form.latitude || '')} onChange={(e) => setForm({ ...form, latitude: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label={ar ? 'Longitude' : 'Longitude'}>
              <Input value={String(form.longitude || '')} onChange={(e) => setForm({ ...form, longitude: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label={ar ? 'الحالة' : 'Status'}>
              <SelectInput value={String(form.status || 'active')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">{ar ? 'نشط' : 'Active'}</option>
                <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
              </SelectInput>
            </FormField>
            <FormField label={ar ? 'الترتيب' : 'Sort order'}>
              <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </FormField>
          </FormGrid>
          <FormField label={ar ? 'الوصف' : 'Description'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={String(form.description || '')} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الاشتراك والأسعار' : 'Membership info'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={String(form.subscription_info || '')} onChange={(e) => setForm({ ...form, subscription_info: e.target.value })} />
          </FormField>
        </div>
      )}
    />
  );
}
