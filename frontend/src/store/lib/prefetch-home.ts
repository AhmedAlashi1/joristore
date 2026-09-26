import { storeApi, unwrap } from './api';
import { readStoreCache, writeStoreCache } from './store-cache';
import type { ProductCardData } from '../components/product/ProductCard';

export const HOME_CACHE_KEY = 'home';
export const PROMO_CACHE_KEY = 'promo-banners';

const HOME_CATEGORIES_LIMIT = 12;
const RAIL_LIMIT = 10;

type HomeCache = {
  categories: { id: number; name: string; slug: string; parent_id?: number | null; image?: string | null }[];
  newArrivals: ProductCardData[];
  bestSellers: ProductCardData[];
  weeklyDeals: ProductCardData[];
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
      storeApi.categories().then((r) => unwrap<{ id: number; name: string; slug: string; parent_id?: number | null; image?: string | null }[]>(r)),
      storeApi.products({ sort: 'new', per_page: RAIL_LIMIT }).then((r) => unwrap<{ data: ProductCardData[] }>(r)),
      storeApi.products({ sort: 'bestseller', per_page: RAIL_LIMIT }).then((r) => unwrap<{ data: ProductCardData[] }>(r)),
      storeApi.products({ on_sale: true, per_page: RAIL_LIMIT }).then((r) => unwrap<{ data: ProductCardData[] }>(r)),
    ])
      .then(([cats, newest, bestsellers, deals]) => {
        writeStoreCache(HOME_CACHE_KEY, {
          categories: cats.filter((c) => !c.parent_id).slice(0, HOME_CATEGORIES_LIMIT),
          newArrivals: (newest.data || []).slice(0, RAIL_LIMIT),
          bestSellers: (bestsellers.data || []).slice(0, RAIL_LIMIT),
          weeklyDeals: (deals.data || []).slice(0, RAIL_LIMIT),
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
