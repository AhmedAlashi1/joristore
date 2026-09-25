import { storeApi, unwrap } from './api';
import { readStoreCache, writeStoreCache } from './store-cache';

export const HOME_CACHE_KEY = 'home';
export const PROMO_CACHE_KEY = 'promo-banners';

const HOME_FEATURED_LIMIT = 4;
const HOME_CATEGORIES_LIMIT = 6;

type HomeCache = {
  categories: { id: number; name: string; slug: string; image?: string | null }[];
  featured: unknown[];
};

export function getCachedHome(): HomeCache | null {
  return readStoreCache<HomeCache>(HOME_CACHE_KEY);
}

export function getCachedPromos() {
  return readStoreCache<{ id: number; title: string; title_en?: string | null; image: string; link: string }[]>(
    PROMO_CACHE_KEY,
  );
}

let inflight: Promise<void> | null = null;

/** Refresh home + promos in background; keeps last good data in session/local cache. */
export function prefetchStoreHome(): Promise<void> {
  if (inflight) return inflight;
  inflight = Promise.all([
    Promise.all([
      storeApi.categories().then((r) => unwrap<{ id: number; name: string; slug: string; image?: string | null }[]>(r)),
      storeApi.products({ featured: true, per_page: HOME_FEATURED_LIMIT }).then((r) =>
        unwrap<{ data: unknown[] }>(r),
      ),
    ])
      .then(([cats, prods]) => {
        writeStoreCache(HOME_CACHE_KEY, {
          categories: cats.slice(0, HOME_CATEGORIES_LIMIT),
          featured: (prods.data || []).slice(0, HOME_FEATURED_LIMIT),
        });
      })
      .catch(() => undefined),
    storeApi.promoBanners()
      .then((r) => writeStoreCache(PROMO_CACHE_KEY, unwrap(r)))
      .catch(() => undefined),
  ])
    .then(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
