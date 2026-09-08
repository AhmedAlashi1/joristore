import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './button';
import { uploadMedia, mediaUrl } from '../../lib/media';
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
  const [uploading, setUploading] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadMedia(file, folder);
      onChange(result.path);
      notify.success(ar ? 'تم رفع الصورة' : 'Image uploaded');
    } catch (error) {
      notify.errorFrom(error, ar ? 'فشل رفع الصورة' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-[#6f6b7d] dark:text-[#b6b8cc]">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img src={mediaUrl(value)} alt="" className="h-20 w-20 rounded-xl border border-white/50 object-cover shadow-sm" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-[#c8cad8] bg-white/30 text-xs text-[#8a8da8]">
            {ar ? 'بدون صورة' : 'No image'}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={pickFile} disabled={uploading}>
            {uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
            {uploading ? (ar ? 'جاري الرفع...' : 'Uploading...') : (ar ? 'اختر صورة' : 'Choose image')}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" className="h-8 text-xs text-[#ea5455]" onClick={() => onChange('')}>
              {ar ? 'إزالة الصورة' : 'Remove image'}
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={onFileChange} />
      <p className="text-xs text-[#8a8da8]">{ar ? 'PNG, JPG, WEBP, GIF, SVG — حتى 5MB' : 'PNG, JPG, WEBP, GIF, SVG — up to 5MB'}</p>
    </div>
  );
}
