export type StoreTheme = {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
};

export const DEFAULT_LOGO = '/logo.svg';
export const STORE_BRAND_CACHE_KEY = 'jori-store-brand';

export type StoreBrandSnapshot = {
  name: string;
  description?: string | null;
  logo?: string | null;
  theme: StoreTheme;
};

export const defaultTheme: StoreTheme = {
  primary: '#7367f0',
  background: '#eef0f8',
  foreground: '#1a1a2e',
  accent: '#28c76f',
};

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '115, 103, 240';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function applyStoreTheme(theme: StoreTheme) {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--fg', theme.foreground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--primary-soft', `rgba(${hexToRgb(theme.primary)}, 0.12)`);
  root.style.setProperty('--primary-rgb', hexToRgb(theme.primary));
  root.style.setProperty('--accent-rgb', hexToRgb(theme.accent));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.primary);
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
    const origin = import.meta.env.VITE_API_ORIGIN;
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
  applyBootSplashBrand(cached);
}
