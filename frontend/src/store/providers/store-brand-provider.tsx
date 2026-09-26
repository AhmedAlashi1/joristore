import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storeApi, unwrap } from '../lib/api';
import {
  cacheStoreBrand,
  defaultTheme,
  DEFAULT_LOGO,
  loadCachedStoreBrand,
  resolveBrandAsset,
  type StoreBrandSnapshot,
  type StoreTheme,
} from '../lib/store-brand';

export type { StoreTheme };

type StoreBrandCtx = {
  name: string;
  description: string;
  logo: string;
  theme: StoreTheme;
  social: Record<string, string | null | undefined>;
  currency: string;
  currencySymbol: string;
  loaded: boolean;
};

const fallback: StoreBrandCtx = {
  name: 'Jori Store',
  description: 'تسوق بكل سهولة',
  logo: DEFAULT_LOGO,
  theme: defaultTheme,
  social: {},
  currency: 'ILS',
  currencySymbol: '₪',
  loaded: false,
};

const StoreBrandContext = createContext<StoreBrandCtx>(fallback);

function snapshotFromApi(data: {
  name?: string;
  description?: string | null;
  logo?: string | null;
  theme?: Partial<StoreTheme>;
  social?: Record<string, string | null>;
  currency?: string | null;
  currency_symbol?: string | null;
}): StoreBrandSnapshot {
  return {
    name: data.name || fallback.name,
    description: data.description,
    logo: data.logo,
    theme: { ...defaultTheme, ...data.theme },
    social: data.social ?? {},
    currency: data.currency ?? fallback.currency,
    currencySymbol: data.currency_symbol?.trim() || fallback.currencySymbol,
  };
}

export function StoreBrandProvider({ children }: { children: ReactNode }) {
  const cached = loadCachedStoreBrand();
  const [brand, setBrand] = useState<StoreBrandCtx>(() => ({
    name: cached?.name ?? fallback.name,
    description: cached?.description ?? fallback.description,
    logo: resolveBrandAsset(cached?.logo),
    theme: { ...defaultTheme, ...cached?.theme },
    social: cached?.social ?? {},
    currency: cached?.currency ?? fallback.currency,
    currencySymbol: cached?.currencySymbol ?? fallback.currencySymbol,
    loaded: Boolean(cached),
  }));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBrand((prev) => (prev.loaded ? prev : { ...prev, loaded: true }));
    }, 2500);

    storeApi.info()
      .then((r) => {
        const data = unwrap<{
          name?: string;
          description?: string | null;
          logo?: string | null;
          theme?: Partial<StoreTheme>;
          social?: Record<string, string | null>;
          currency?: string | null;
          currency_symbol?: string | null;
        }>(r);
        const snap = snapshotFromApi(data);
        cacheStoreBrand(snap);
        setBrand({
          name: snap.name,
          description: snap.description || fallback.description,
          logo: resolveBrandAsset(snap.logo),
          theme: snap.theme,
          social: snap.social ?? {},
          currency: snap.currency ?? fallback.currency,
          currencySymbol: snap.currencySymbol ?? fallback.currencySymbol,
          loaded: true,
        });
      })
      .catch(() => {
        setBrand((prev) => ({ ...prev, loaded: true }));
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => clearTimeout(timeout);
  }, []);

  const value = useMemo(() => brand, [brand]);

  return <StoreBrandContext.Provider value={value}>{children}</StoreBrandContext.Provider>;
}

export function useStoreBrand() {
  return useContext(StoreBrandContext);
}

/** @deprecated use useStoreBrand */
export function useTheme() {
  const { theme, loaded } = useStoreBrand();
  return { theme, loaded };
}

/** @deprecated use StoreBrandProvider */
export const ThemeProvider = StoreBrandProvider;
