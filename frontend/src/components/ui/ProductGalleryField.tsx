import { ChevronLeft, ChevronRight, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { ImageUploadField } from './ImageUploadField';
import { api } from '../../lib/api';
import { ensureApiSuccess } from '../../lib/api-response';
import { prepareProductImageForPublish } from '../../lib/image-crop';
import { uploadMedia, mediaUrl } from '../../lib/media';
import { fetchStoreLogoPath } from '../../lib/store-logo-path';
import { useNotify } from '../../lib/notify';
import { useI18n } from '../../providers/i18n-provider';

type ProductGalleryFieldProps = {
  primary: string;
  gallery: string[];
  onChange: (next: { primary: string; gallery: string[] }) => void;
};

export function ProductGalleryField({ primary, gallery, onChange }: ProductGalleryFieldProps) {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const notify = useNotify();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const storeLogoPathRef = useRef<string | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  useEffect(() => {
    api.get('/admin/settings/store')
      .then((res) => {
        const data = ensureApiSuccess<{ store?: { logo?: string | null } }>(res, '');
        storeLogoPathRef.current = data.store?.logo?.trim() || null;
      })
      .catch(() => undefined);
  }, []);

  const setPrimary = (path: string) => onChange({ primary: path, gallery });
  const setGallery = (paths: string[]) => onChange({ primary, gallery: paths });

  const makePrimary = (path: string) => {
    if (path === primary) return;
    const rest = gallery.filter((p) => p !== path);
    if (primary) rest.unshift(primary);
    onChange({ primary: path, gallery: rest.filter((p) => p !== path) });
  };

  const moveGallery = (index: number, dir: -1 | 1) => {
    const next = [...gallery];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setGallery(next);
  };

  const onGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingGallery(true);
    try {
      const logoPath = await fetchStoreLogoPath(storeLogoPathRef.current);
      storeLogoPathRef.current = logoPath;
      const { file: prepared, logoApplied } = await prepareProductImageForPublish(file, { watermarkLogoPath: logoPath });
      const result = await uploadMedia(prepared, 'products');
      if (logoPath && !logoApplied) {
        notify.error(ar ? 'الصورة رُفعت بدون شعار' : 'Uploaded without logo stamp');
      }
      setGallery([...gallery, result.path]);
      notify.success(ar ? 'تمت إضافة صورة للمعرض' : 'Gallery image added');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'Invalid image' || msg === 'Could not compress image') {
        notify.error(
          ar
            ? 'تعذّر قراءة الصورة. استخدم JPG أو PNG (حوّل HEIC من الجوال إلى JPG إن لزم).'
            : 'Could not read this image. Use JPG or PNG (convert HEIC to JPG if needed).',
        );
      } else {
        notify.errorFrom(error, ar ? 'فشل رفع الصورة' : 'Upload failed');
      }
    } finally {
      setUploadingGallery(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/15 p-3 dark:border-white/8">
      <ImageUploadField
        label={ar ? 'الصورة الأساسية (غلاف المنتج)' : 'Primary image (product cover)'}
        folder="products"
        value={primary}
        onChange={(path) => setPrimary(path)}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-[#6f6b7d] dark:text-[#b6b8cc]">
          {ar ? 'صور إضافية (زوايا / تفاصيل)' : 'Extra images (angles / details)'}
        </p>
        <p className="text-xs text-[#8a8da8]">
          {ar
            ? 'ارفع زوايا مختلفة كما هي — الشعار والضغط تلقائي. تظهر في صفحة المنتج مع التمرير والتكبير.'
            : 'Upload angles as-is — logo and compression are automatic. Shown with swipe and zoom on the product page.'}
        </p>

        <div className="flex flex-wrap items-start gap-2">
          {gallery.map((path, index) => (
            <div
              key={`${path}-${index}`}
              className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-xl border border-white/40 bg-white/30 shadow-sm"
            >
              <img src={mediaUrl(path)} alt="" className="h-full w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/55 p-0.5">
                <button
                  type="button"
                  className="rounded p-0.5 text-white hover:bg-white/20"
                  title={ar ? 'تعيين كأساسية' : 'Set as primary'}
                  onClick={() => makePrimary(path)}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-white hover:bg-white/20"
                  onClick={() => moveGallery(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-white hover:bg-white/20"
                  onClick={() => moveGallery(index, 1)}
                  disabled={index === gallery.length - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-[#ffb4b4] hover:bg-white/20"
                  onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={uploadingGallery}
            onClick={() => galleryInputRef.current?.click()}
            className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#c8cad8] bg-white/20 text-[10px] font-semibold text-[#7367f0] transition hover:border-[#7367f0]"
          >
            {uploadingGallery ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {ar ? 'إضافة' : 'Add'}
          </button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onGalleryFile}
        />
      </div>

      {!primary && gallery.length > 0 ? (
        <Button type="button" variant="secondary" className="h-9 text-xs" onClick={() => makePrimary(gallery[0])}>
          {ar ? 'استخدم أول صورة إضافية كأساسية' : 'Use first gallery image as primary'}
        </Button>
      ) : null}
    </div>
  );
}
