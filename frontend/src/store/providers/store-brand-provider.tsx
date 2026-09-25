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
  loaded: boolean;
};

const fallback: StoreBrandCtx = {
  name: 'Jori Store',
  description: 'تسوق بكل سهولة',
  logo: DEFAULT_LOGO,
  theme: defaultTheme,
  loaded: false,
};

const StoreBrandContext = createContext<StoreBrandCtx>(fallback);

function snapshotFromApi(data: {
  name?: string;
  description?: string | null;
  logo?: string | null;
  theme?: Partial<StoreTheme>;
}): StoreBrandSnapshot {
  return {
    name: data.name || fallback.name,
    description: data.description,
    logo: data.logo,
    theme: { ...defaultTheme, ...data.theme },
  };
}

export function StoreBrandProvider({ children }: { children: ReactNode }) {
  const cached = loadCachedStoreBrand();
  const [brand, setBrand] = useState<StoreBrandCtx>(() => ({
    name: cached?.name ?? fallback.name,
    description: cached?.description ?? fallback.description,
    logo: resolveBrandAsset(cached?.logo),
    theme: { ...defaultTheme, ...cached?.theme },
    loaded: false,
  }));

  useEffect(() => {
    storeApi.info()
      .then((r) => {
        const data = unwrap<{ name?: string; description?: string | null; logo?: string | null; theme?: Partial<StoreTheme> }>(r);
        const snap = snapshotFromApi(data);
        cacheStoreBrand(snap);
        setBrand({
          name: snap.name,
          description: snap.description || fallback.description,
          logo: resolveBrandAsset(snap.logo),
          theme: snap.theme,
          loaded: true,
        });
      })
      .catch(() => {
        setBrand((prev) => ({ ...prev, loaded: true }));
      });
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
