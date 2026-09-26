import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storeApi, unwrap } from '../lib/api';
import { StoreMediaImage } from '../components/media/StoreMediaImage';
import { useLocale } from '../providers/locale-provider';

type GymDetail = {
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
};

const dayLabels: Record<string, { ar: string; en: string }> = {
  sun: { ar: 'الأحد', en: 'Sun' },
  mon: { ar: 'الإثنين', en: 'Mon' },
  tue: { ar: 'الثلاثاء', en: 'Tue' },
  wed: { ar: 'الأربعاء', en: 'Wed' },
  thu: { ar: 'الخميس', en: 'Thu' },
  fri: { ar: 'الجمعة', en: 'Fri' },
  sat: { ar: 'السبت', en: 'Sat' },
};

export function GymPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const ar = locale === 'ar';
  const [gym, setGym] = useState<GymDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    storeApi.gym(Number(id))
      .then((r) => setGym(unwrap<GymDetail>(r)))
      .catch(() => navigate('/'));
  }, [id, navigate]);

  if (!gym) {
    return <div className="glass aspect-video animate-pulse rounded-3xl" />;
  }

  const title = ar ? gym.name : (gym.name_en || gym.name);
  const hours = gym.opening_hours ?? {};

  return (
    <div className="space-y-4 pb-4 page-slide-left">
      <button type="button" onClick={() => navigate(-1)} className="glass glass-interactive flex h-10 w-10 items-center justify-center rounded-xl">
        <ArrowRight size={20} className="rtl:rotate-180" />
      </button>

      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="relative h-44 w-full">
          <StoreMediaImage src={gym.cover_image} alt={title} />
        </div>
        <div className="space-y-2 p-5">
          <h1 className="text-xl font-bold">{title}</h1>
          {gym.sector || gym.city ? (
            <p className="flex items-center gap-1 text-sm text-store-muted">
              <MapPin size={14} className="text-[var(--primary)]" />
              {[gym.sector, gym.city].filter(Boolean).join(' — ')}
            </p>
          ) : null}
          {gym.description ? <p className="text-sm leading-relaxed text-[#6f6b7d]">{gym.description}</p> : null}
        </div>
      </div>

      {(gym.gallery ?? []).length > 0 ? (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {(gym.gallery ?? []).map((src) => (
            <div key={src} className="h-24 w-32 shrink-0 overflow-hidden rounded-xl">
              <StoreMediaImage src={src} alt="" />
            </div>
          ))}
        </div>
      ) : null}

      {Object.keys(hours).length > 0 ? (
        <section className="glass-strong rounded-2xl p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Clock size={16} className="text-[var(--primary)]" />
            {t.gymHours}
          </h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(hours).map(([key, row]) => {
              const label = dayLabels[key]?.[ar ? 'ar' : 'en'] ?? key;
              const line = row.closed
                ? (ar ? 'مغلق' : 'Closed')
                : `${row.open ?? '—'} – ${row.close ?? '—'}`;
              return (
                <li key={key} className="flex justify-between gap-2 border-b border-white/10 pb-2 last:border-0">
                  <span className="font-semibold">{label}</span>
                  <span className="text-store-muted" dir="ltr">{line}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {gym.subscription_info ? (
        <section className="glass-strong rounded-2xl p-4">
          <h2 className="mb-2 text-sm font-bold">{t.gymSubscription}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#6f6b7d]">{gym.subscription_info}</p>
        </section>
      ) : null}
    </div>
  );
}
