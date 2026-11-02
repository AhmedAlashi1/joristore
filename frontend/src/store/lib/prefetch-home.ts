import { storeApi, unwrap } from './api';
import { readStoreCache, writeStoreCache } from './store-cache';
import type { ProductCardData } from '../components/product/ProductCard';

export const HOME_CACHE_KEY = 'home';
export const PROMO_CACHE_KEY = 'promo-banners';

const HOME_CATEGORIES_LIMIT = 12;
const RAIL_LIMIT = 10;

type HomeCache = {
  categories: {
    id: number;
    name: string;
    name_en?: string | null;
    slug: string;
    parent_id?: number | null;
    image?: string | null;
    updated_at?: string | null;
  }[];
  newArrivals: ProductCardData[];
  bestSellers: ProductCardData[];
  weeklyDeals: ProductCardData[];
};

export function getCachedHome(): HomeCache | null {
  return readStoreCache<HomeCache>(HOME_CACHE_KEY);
}

export type StorePromoBanner = {
  id: number;
  title: string;
  title_en?: string | null;
  image: string;
  link: string;
  updated_at?: string | null;
};

export function getCachedPromos(): StorePromoBanner[] | null {
  return readStoreCache<StorePromoBanner[]>(PROMO_CACHE_KEY);
}

export async function reloadPromoBanners(force = false): Promise<StorePromoBanner[]> {
  const res = await storeApi.promoBanners(force ? Date.now() : undefined);
  const list = unwrap<StorePromoBanner[]>(res) ?? [];
  writeStoreCache(PROMO_CACHE_KEY, list);
  return list;
}

let inflight: Promise<void> | null = null;

/** Refresh home + promos in background; keeps last good data in session/local cache. */
export function prefetchStoreHome(options?: { force?: boolean }): Promise<void> {
  if (options?.force) {
    inflight = null;
  }
  if (inflight) return inflight;
  inflight = Promise.all([
    Promise.all([
      storeApi.categories().then((r) => unwrap<HomeCache['categories']>(r)),
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
    reloadPromoBanners(options?.force === true).catch(() => undefined),
  ])
    .then(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
