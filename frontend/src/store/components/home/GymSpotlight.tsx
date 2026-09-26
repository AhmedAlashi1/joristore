import { Clock, Dumbbell, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi, unwrap } from '../../lib/api';
import { StoreMediaImage } from '../media/StoreMediaImage';
import { useLocale } from '../../providers/locale-provider';

type GymSummary = {
  id: number;
  name: string;
  name_en?: string | null;
  sector?: string | null;
  city?: string | null;
  cover_image?: string | null;
  description?: string | null;
};

export function GymSpotlight() {
  const { locale, t } = useLocale();
  const ar = locale === 'ar';
  const [gyms, setGyms] = useState<GymSummary[]>([]);

  useEffect(() => {
    const sector = localStorage.getItem('jori_customer_sector') || '';
    const city = localStorage.getItem('jori_customer_city') || '';
    const params: Record<string, string> = {};
    if (sector) params.sector = sector;
    else if (city) params.city = city;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void storeApi
            .gyms({ ...params, lat: pos.coords.latitude, lng: pos.coords.longitude })
            .then((r) => setGyms(unwrap<GymSummary[]>(r)))
            .catch(() => undefined);
        },
        () => {
          void storeApi.gyms(params).then((r) => setGyms(unwrap<GymSummary[]>(r))).catch(() => undefined);
        },
        { timeout: 8000, maximumAge: 600_000 },
      );
    } else {
      void storeApi.gyms(params).then((r) => setGyms(unwrap<GymSummary[]>(r))).catch(() => undefined);
    }
  }, []);

  if (gyms.length === 0) return null;

  const gym = gyms[0];
  const title = ar ? gym.name : (gym.name_en || gym.name);

  return (
    <section className="glass-strong overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={18} className="text-[var(--primary)]" />
          <h2 className="text-sm font-bold">{t.nearbyGym}</h2>
        </div>
        <Link to={`/gym/${gym.id}`} className="text-xs font-bold text-[var(--primary)]">
          {t.viewDetails}
        </Link>
      </div>
      <Link to={`/gym/${gym.id}`} className="mt-3 block">
        <div className="relative h-36 w-full overflow-hidden">
          <StoreMediaImage src={gym.cover_image} alt={title} />
        </div>
        <div className="space-y-1 px-4 py-3">
          <p className="font-bold">{title}</p>
          {gym.sector || gym.city ? (
            <p className="flex items-center gap-1 text-xs text-store-muted">
              <MapPin size={12} />
              {[gym.sector, gym.city].filter(Boolean).join(' — ')}
            </p>
          ) : null}
          {gym.description ? (
            <p className="line-clamp-2 text-xs text-[#6f6b7d]">{gym.description}</p>
          ) : null}
          <p className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)]">
            <Clock size={11} />
            {t.gymHoursHint}
          </p>
        </div>
      </Link>
    </section>
  );
}
