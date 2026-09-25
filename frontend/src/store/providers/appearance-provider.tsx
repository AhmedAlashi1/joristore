import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyStoreBrandColors,
  applyStoreSurfaces,
  type StoreTheme,
} from '../lib/store-brand';

export type ColorScheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'store_color_scheme';

type AppearanceCtx = {
  scheme: ColorScheme;
  resolved: 'light' | 'dark';
  isDark: boolean;
  setScheme: (scheme: ColorScheme) => void;
  cycleScheme: () => void;
};

const AppearanceContext = createContext<AppearanceCtx | null>(null);

function readStoredScheme(): ColorScheme {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  return 'system';
}

function resolveScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return scheme;
}

type AppearanceProviderProps = {
  children: ReactNode;
  /** Brand theme from API — surfaces follow light/dark; colors stay from admin */
  brandTheme: StoreTheme;
};

export function AppearanceProvider({ children, brandTheme }: AppearanceProviderProps) {
  const [scheme, setSchemeState] = useState<ColorScheme>(readStoredScheme);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveScheme(readStoredScheme()));

  const syncResolved = useCallback((nextScheme: ColorScheme) => {
    setResolved(resolveScheme(nextScheme));
  }, []);

  const setScheme = useCallback(
    (next: ColorScheme) => {
      setSchemeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      syncResolved(next);
    },
    [syncResolved],
  );

  const cycleScheme = useCallback(() => {
    setSchemeState((prev) => {
      const next: ColorScheme = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      syncResolved(next);
      return next;
    });
  }, [syncResolved]);

  useEffect(() => {
    syncResolved(scheme);
  }, [scheme, syncResolved]);

  useEffect(() => {
    if (scheme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncResolved('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [scheme, syncResolved]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('store-appearance-active');
    html.classList.toggle('store-dark-mode', resolved === 'dark');
    applyStoreBrandColors(brandTheme);
    applyStoreSurfaces(brandTheme, resolved);
    html.style.colorScheme = resolved;
    document.body.style.background = resolved === 'dark' ? '#0e1017' : brandTheme.background;
    document.body.style.color = resolved === 'dark' ? '#eceef8' : brandTheme.foreground;

    return () => {
      html.classList.remove('store-appearance-active', 'store-dark-mode');
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, [brandTheme, resolved]);

  const value = useMemo<AppearanceCtx>(
    () => ({
      scheme,
      resolved,
      isDark: resolved === 'dark',
      setScheme,
      cycleScheme,
    }),
    [scheme, resolved, setScheme, cycleScheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance outside AppearanceProvider');
  return ctx;
}
