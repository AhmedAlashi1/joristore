import { useI18n } from '../../providers/i18n-provider';

type AutoEnglishPreviewProps = {
  name_en?: string | null;
  short_description_en?: string | null;
  description_en?: string | null;
  description_en_only?: string | null;
};

export function AutoEnglishPreview({
  name_en,
  short_description_en,
  description_en,
  description_en_only,
}: AutoEnglishPreviewProps) {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const desc = description_en ?? description_en_only;
  const hasAny = Boolean(name_en?.trim() || short_description_en?.trim() || desc?.trim());
  if (!hasAny) {
    return (
      <p className="text-xs text-[#8a8da8]">
        {ar
          ? 'يُترجم الإنجليزي تلقائياً عند الحفظ (يتطلب OPENAI_API_KEY على السيرفر).'
          : 'English is auto-filled on save (requires OPENAI_API_KEY on the server).'}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#7367f0]/25 bg-[#7367f0]/5 p-3 text-sm">
      <p className="text-xs font-bold text-[#7367f0]">
        {ar ? 'الإنجليزية (تلقائي)' : 'English (auto)'}
      </p>
      {name_en?.trim() ? (
        <p dir="ltr" className="font-medium text-[#6f6b7d] dark:text-[#b6b8cc]">{name_en}</p>
      ) : null}
      {short_description_en?.trim() ? (
        <p dir="ltr" className="text-xs text-[#8a8da8]">{short_description_en}</p>
      ) : null}
      {desc?.trim() ? (
        <p dir="ltr" className="whitespace-pre-wrap text-xs leading-relaxed text-[#8a8da8]">{desc}</p>
      ) : null}
    </div>
  );
}
