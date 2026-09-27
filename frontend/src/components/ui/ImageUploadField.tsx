import { Loader2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { mediaUrl, uploadMedia } from '../../lib/media';
import { fetchStoreLogoPath } from '../../lib/store-logo-path';
import {
  cropImageFileForPreset,
  IMAGE_CROP_PRESETS,
  prepareProductImageForPublish,
} from '../../lib/image-crop';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';

type UploadFolder = 'logos' | 'banners' | 'categories' | 'products';

type ImageUploadFieldProps = {
  value?: string;
  onChange: (path: string) => void;
  folder: UploadFolder;
  label?: string;
};

export function ImageUploadField({ value = '', onChange, folder, label }: ImageUploadFieldProps) {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const inputRef = useRef<HTMLInputElement>(null);
  const storeLogoPathRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const preset = IMAGE_CROP_PRESETS[folder];

  useEffect(() => {
    if (folder !== 'products') return;
    api.get('/admin/settings/store')
      .then((res) => {
        const data = ensureApiSuccess<{ store?: { logo?: string | null } }>(res, '');
        storeLogoPathRef.current = data.store?.logo?.trim() || null;
      })
      .catch(() => undefined);
  }, [folder]);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      let prepared: File;
      if (folder === 'products') {
        const logoPath = await fetchStoreLogoPath(storeLogoPathRef.current);
        storeLogoPathRef.current = logoPath;
        const { file: out, logoApplied } = await prepareProductImageForPublish(file, { watermarkLogoPath: logoPath });
        prepared = out;
        const result = await uploadMedia(prepared, folder);
        onChange(result.path);
        if (logoPath && !logoApplied) {
          notify.error(ar ? 'رفعت الصورة لكن الشعار لم يُطبّق — تأكد من شعار المتجر في الإعدادات' : 'Uploaded but logo was not applied — check store logo in settings');
        } else {
          notify.success(
            logoApplied
              ? (ar ? 'تم الشعار والضغط والرفع' : 'Logo, compress, upload done')
              : (ar ? 'تم ضغط الصورة ورفعها' : 'Image optimized and uploaded'),
          );
        }
        return;
      }

      prepared = await cropImageFileForPreset(file, preset);
      const result = await uploadMedia(prepared, folder);
      onChange(result.path);
      notify.success(ar ? 'تم تجهيز الصورة ورفعها' : 'Image prepared and uploaded');
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل رفع الصورة' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const previewAspect = folder === 'products' ? undefined : preset.aspectRatio;

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-[#6f6b7d] dark:text-[#b6b8cc]">{label}</p> : null}
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div
            className="overflow-hidden rounded-xl border border-white/50 shadow-sm"
            style={
              previewAspect
                ? { aspectRatio: String(previewAspect), width: previewAspect >= 1 ? '7.5rem' : '6rem' }
                : { width: '6.5rem', height: '6.5rem' }
            }
          >
            <img src={mediaUrl(value)} alt="" className="h-full w-full object-contain bg-white/40" />
          </div>
        ) : (
          <div
            className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-xl border border-dashed border-[#c8cad8] bg-white/30 text-[10px] text-[#8a8da8]"
            style={previewAspect ? { aspectRatio: String(previewAspect), width: previewAspect >= 1 ? '7.5rem' : '6rem', height: undefined } : undefined}
          >
            {ar ? 'معاينة' : 'Preview'}
          </div>
        )}
        <div className="flex min-w-[10rem] flex-1 flex-col gap-2">
          <Button type="button" variant="secondary" onClick={pickFile} disabled={uploading}>
            {uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
            {uploading ? (ar ? 'جاري التجهيز...' : 'Preparing...') : (ar ? 'اختر صورة' : 'Choose image')}
          </Button>
          {folder === 'products' ? (
            <p className="text-xs text-[#8a8da8]">
              {ar ? 'يُضاف شعار المتجر تلقائياً من الإعدادات (إن وُجد).' : 'Store logo from settings is applied automatically when set.'}
            </p>
          ) : null}
          {value ? (
            <Button type="button" variant="ghost" className="h-8 text-xs text-[#ea5455]" onClick={() => onChange('')}>
              {ar ? 'إزالة الصورة' : 'Remove image'}
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={onFileChange} />
      <p className="text-xs leading-relaxed text-[#8a8da8]">{ar ? preset.hintAr : preset.hintEn}</p>
    </div>
  );
}
