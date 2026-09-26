import { MessageCircle } from 'lucide-react';
import { SocialLinks } from '../components/social/SocialLinks';
import { useLocale } from '../providers/locale-provider';
import { useStoreBrand } from '../providers/store-brand-provider';

export function ContactPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { name: storeName } = useStoreBrand();

  return (
    <div className="space-y-4 pb-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <MessageCircle size={22} className="text-[var(--primary)]" />
        {t.contactUs}
      </h1>
      <p className="text-sm leading-relaxed text-[#8a8da8]">
        {ar
          ? `تواصل مع ${storeName} عبر قنواتنا على السوشال ميديا — نرد في أقرب وقت.`
          : `Reach ${storeName} on social media — we reply as soon as we can.`}
      </p>
      <SocialLinks variant="contact" title={t.followUs} />
    </div>
  );
}
