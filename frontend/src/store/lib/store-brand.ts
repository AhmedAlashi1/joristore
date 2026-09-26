export type StoreTheme = {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
};

export const DEFAULT_LOGO = '/logo.svg';

/** True when the merchant uploaded a logo (not the built-in purple placeholder). */
export function isCustomStoreLogo(logo: string): boolean {
  if (!logo) return false;
  return !/(^|\/)logo\.svg(\?|$)/i.test(logo);
}
export const STORE_BRAND_CACHE_KEY = 'jori-store-brand';

export type StoreSocialLinks = Partial<Record<
  'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'snapchat' | 'youtube' | 'whatsapp',
  string | null
>>;

export type StoreBrandSnapshot = {
  name: string;
  description?: string | null;
  logo?: string | null;
  theme: StoreTheme;
  social?: StoreSocialLinks;
  currency?: string | null;
  currencySymbol?: string | null;
};

export const defaultTheme: StoreTheme = {
  primary: '#6c63ff',
  background: '#f3f4fb',
  foreground: '#141626',
  accent: '#22b07d',
};

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '115, 103, 240';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getStoreThemeTarget(): HTMLElement {
  return document.querySelector('.store-app') ?? document.documentElement;
}

export function applyStoreBrandColors(theme: StoreTheme) {
  const root = getStoreThemeTarget();
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--primary-soft', `rgba(${hexToRgb(theme.primary)}, 0.12)`);
  root.style.setProperty('--primary-rgb', hexToRgb(theme.primary));
  root.style.setProperty('--accent-rgb', hexToRgb(theme.accent));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.primary);
}

export function applyStoreSurfaces(theme: StoreTheme, mode: 'light' | 'dark' = 'light') {
  const root = getStoreThemeTarget();
  if (mode === 'light') {
    root.style.setProperty('--bg', theme.background);
    root.style.setProperty('--fg', theme.foreground);
  } else {
    root.style.removeProperty('--bg');
    root.style.removeProperty('--fg');
  }
}

/** Apply full theme (boot / legacy) */
export function applyStoreTheme(theme: StoreTheme, mode: 'light' | 'dark' = 'light') {
  applyStoreBrandColors(theme);
  applyStoreSurfaces(theme, mode);
}

export function cacheStoreBrand(brand: StoreBrandSnapshot) {
  try {
    localStorage.setItem(STORE_BRAND_CACHE_KEY, JSON.stringify(brand));
  } catch {
    /* ignore quota errors */
  }
}

export function loadCachedStoreBrand(): StoreBrandSnapshot | null {
  try {
    const raw = localStorage.getItem(STORE_BRAND_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoreBrandSnapshot;
  } catch {
    return null;
  }
}

export function applyBootSplashBrand(brand: StoreBrandSnapshot) {
  const boot = document.getElementById('boot-splash');
  if (!boot) return;

  const img = boot.querySelector('img');
  const label = boot.querySelector('p');
  const logo = brand.logo ? resolveBrandAsset(brand.logo) : DEFAULT_LOGO;

  if (img instanceof HTMLImageElement) img.src = logo;
  if (label) label.textContent = brand.name;
}

export function resolveBrandAsset(path?: string | null): string {
  if (!path) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/storage/')) {
    const origin = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_BACKEND_ORIGIN;
    if (origin) return `${origin}${path}`;
    return path;
  }
  if (path.startsWith('/')) return path;
  return `/${path.replace(/^\/+/, '')}`;
}

/** Apply cached theme/logo before React mounts (called from index.html). */
export function bootstrapStoreBrandFromCache() {
  const cached = loadCachedStoreBrand();
  if (!cached) return;
  applyStoreTheme({ ...defaultTheme, ...cached.theme });
  document.getElementById('boot-splash')?.remove();
}
