import { useEffect, useState } from 'react';
import { useLocale } from '../providers/locale-provider';
import { storeApi, unwrap } from '../lib/api';

type LegalContent = {
  terms_ar?: string;
  terms_en?: string;
  privacy_ar?: string;
  privacy_en?: string;
};

export function TermsPage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const [content, setContent] = useState<LegalContent>({});

  useEffect(() => {
    storeApi.legal().then((r) => setContent(unwrap<LegalContent>(r))).catch(() => undefined);
  }, []);

  const text = ar ? (content.terms_ar || content.terms_en) : (content.terms_en || content.terms_ar);
  const privacy = ar ? (content.privacy_ar || content.privacy_en) : (content.privacy_en || content.privacy_ar);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">{ar ? 'الشروط والأحكام' : 'Terms & Conditions'}</h1>
      <div className="glass-strong rounded-2xl p-5">
        {text ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#6f6b7d]">{text}</div>
        ) : (
          <p className="text-sm text-[#8a8da8]">{ar ? 'لم تُضف الشروط بعد من لوحة الإدارة' : 'Terms not configured yet'}</p>
        )}
      </div>
      {privacy ? (
        <div className="glass rounded-2xl p-4">
          <h2 className="mb-2 text-sm font-bold">{ar ? 'الخصوصية' : 'Privacy'}</h2>
          <p className="text-sm text-[#6f6b7d]">{privacy}</p>
        </div>
      ) : null}
    </div>
  );
}
