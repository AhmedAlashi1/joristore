import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FormField, FormGrid } from '../components/crud/CrudPage';
import { Input } from '../components/ui/input';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { api } from '../lib/api';
import { ensureApiSuccess } from '../lib/api-response';
import { useNotify } from '../lib/notify';
import { useI18n } from '../providers/i18n-provider';

type SettingsData = {
  merchant: Record<string, string | null>;
  store: Record<string, string | null> | null;
};

export function SettingsPage() {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [legal, setLegal] = useState<Record<string, string>>({
    terms_ar: '', terms_en: '', privacy_ar: '', privacy_en: '',
  });
  const [legalSaving, setLegalSaving] = useState(false);
  const [theme, setTheme] = useState({
    primary: '#7367f0',
    background: '#eef0f8',
    foreground: '#1a1a2e',
    accent: '#28c76f',
  });
  const [themeSaving, setThemeSaving] = useState(false);

  const themeFields = [
    { key: 'primary', labelAr: 'اللون الأساسي', labelEn: 'Primary color' },
    { key: 'background', labelAr: 'لون الخلفية', labelEn: 'Background color' },
    { key: 'foreground', labelAr: 'لون النص', labelEn: 'Text color' },
    { key: 'accent', labelAr: 'لون التمييز', labelEn: 'Accent color' },
  ] as const;

  useEffect(() => {
    api.get('/admin/settings/store')
      .then((res) => {
        const data = ensureApiSuccess<SettingsData>(res, '');
        setForm({
          business_name: data.merchant?.business_name ?? '',
          legal_name: data.merchant?.legal_name ?? '',
          email: data.merchant?.email ?? '',
          phone: data.merchant?.phone ?? '',
          country_code: data.merchant?.country_code ?? 'SA',
          currency: data.merchant?.currency ?? 'SAR',
          timezone: data.merchant?.timezone ?? 'Asia/Riyadh',
          default_language: data.merchant?.default_language ?? 'ar',
          commercial_registration_number: data.merchant?.commercial_registration_number ?? '',
          tax_number: data.merchant?.tax_number ?? '',
          store_name: data.store?.name ?? '',
          store_description: data.store?.description ?? '',
          store_logo: data.store?.logo ?? '',
          store_email: data.store?.email ?? '',
          store_phone: data.store?.phone ?? '',
        });
      })
      .catch(() => notify.error(ar ? 'فشل تحميل الإعدادات' : 'Failed to load settings'))
      .finally(() => setLoading(false));
    api.get('/admin/settings/legal')
      .then((res) => setLegal(ensureApiSuccess<Record<string, string>>(res, '')))
      .catch(() => undefined);
    api.get('/admin/settings/theme')
      .then((res) => setTheme(ensureApiSuccess<typeof theme>(res, '')))
      .catch(() => undefined);
  }, [ar, notify]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/store', form);
      notify.success(ar ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveLegal = async () => {
    setLegalSaving(true);
    try {
      await api.put('/admin/settings/legal', legal);
      notify.success(ar ? 'تم حفظ الشروط والأحكام' : 'Legal content saved');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setLegalSaving(false);
    }
  };

  const saveTheme = async () => {
    setThemeSaving(true);
    try {
      await api.put('/admin/settings/theme', theme);
      notify.success(ar ? 'تم حفظ ألوان المتجر' : 'Store colors saved');
    } catch (e) {
      notify.errorFrom(e, ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setThemeSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7367f0]" /></div>;
  }

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{ar ? 'إعدادات المتجر' : 'Store Settings'}</h2>
        <p className="text-sm text-[#8a8da8]">{ar ? 'تعديل بيانات النشاط والمتجر' : 'Edit business and store information'}</p>
      </div>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'بيانات التاجر' : 'Merchant Info'}</CardTitle></CardHeader>
        <CardContent>
          <FormGrid>
            <FormField label={ar ? 'اسم النشاط *' : 'Business name *'}>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الاسم القانوني' : 'Legal name'}>
              <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'البريد' : 'Email'}>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الهاتف' : 'Phone'}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'العملة' : 'Currency'}>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'السجل التجاري' : 'CR Number'}>
              <Input value={form.commercial_registration_number} onChange={(e) => setForm({ ...form, commercial_registration_number: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'الرقم الضريبي' : 'Tax number'}>
              <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
            </FormField>
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'بيانات المتجر' : 'Store Info'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormGrid>
            <FormField label={ar ? 'اسم المتجر *' : 'Store name *'}>
              <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'بريد المتجر' : 'Store email'}>
              <Input value={form.store_email} onChange={(e) => setForm({ ...form, store_email: e.target.value })} />
            </FormField>
            <FormField label={ar ? 'هاتف المتجر' : 'Store phone'}>
              <Input value={form.store_phone} onChange={(e) => setForm({ ...form, store_phone: e.target.value })} />
            </FormField>
          </FormGrid>
          <FormField label={ar ? 'الوصف' : 'Description'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} />
          </FormField>
          <div className="col-span-full">
            <ImageUploadField
              label={ar ? 'شعار المتجر' : 'Store logo'}
              folder="logos"
              value={form.store_logo || ''}
              onChange={(path) => setForm({ ...form, store_logo: path })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'ألوان المتجر' : 'Store Theme'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#8a8da8]">
            {ar ? 'تحكم بألوان واجهة المتجر للعملاء (تطبيق PWA)' : 'Control storefront PWA colors for customers'}
          </p>
          <FormGrid>
            {themeFields.map(({ key, labelAr, labelEn }) => (
              <FormField key={key} label={ar ? labelAr : labelEn}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <Input
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
              </FormField>
            ))}
          </FormGrid>
          <div
            className="rounded-2xl p-4 transition-colors"
            style={{ background: theme.background, color: theme.foreground }}
          >
            <p className="text-xs opacity-70">{ar ? 'معاينة' : 'Preview'}</p>
            <p className="mt-1 text-lg font-bold" style={{ color: theme.primary }}>{form.store_name || 'Jori Store'}</p>
            <button
              type="button"
              className="mt-3 rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ background: theme.primary }}
            >
              {ar ? 'زر أساسي' : 'Primary button'}
            </button>
            <span className="ms-2 text-sm font-semibold" style={{ color: theme.accent }}>
              {ar ? 'تمييز' : 'Accent'}
            </span>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveTheme} disabled={themeSaving}>
              {themeSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {ar ? 'حفظ الألوان' : 'Save colors'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong border-0">
        <CardHeader><CardTitle>{ar ? 'الشروط والأحكام' : 'Terms & Legal'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField label={ar ? 'الشروط (عربي)' : 'Terms (Arabic)'}>
            <textarea className="glass-input min-h-[120px] w-full rounded-xl px-3 py-2 text-sm" value={legal.terms_ar || ''} onChange={(e) => setLegal({ ...legal, terms_ar: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الشروط (English)' : 'Terms (English)'}>
            <textarea className="glass-input min-h-[120px] w-full rounded-xl px-3 py-2 text-sm" value={legal.terms_en || ''} onChange={(e) => setLegal({ ...legal, terms_en: e.target.value })} dir="ltr" />
          </FormField>
          <FormField label={ar ? 'الخصوصية (عربي)' : 'Privacy (Arabic)'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={legal.privacy_ar || ''} onChange={(e) => setLegal({ ...legal, privacy_ar: e.target.value })} />
          </FormField>
          <FormField label={ar ? 'الخصوصية (English)' : 'Privacy (English)'}>
            <textarea className="glass-input min-h-[80px] w-full rounded-xl px-3 py-2 text-sm" value={legal.privacy_en || ''} onChange={(e) => setLegal({ ...legal, privacy_en: e.target.value })} dir="ltr" />
          </FormField>
          <div className="flex justify-end">
            <Button onClick={saveLegal} disabled={legalSaving}>
              {legalSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {ar ? 'حفظ الشروط' : 'Save legal'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {ar ? 'حفظ الإعدادات' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
