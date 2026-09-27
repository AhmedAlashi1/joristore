import { resolveApiBaseUrl } from '../../lib/hosts';
import { absoluteStorageUrl } from '../../lib/storage-origin';

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
const STORE_LOGO_DATA_KEY = 'jori-store-logo-data';
const STORE_LOGO_FOR_KEY = 'jori-store-logo-for';

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

function setMetaContent(name: string, content: string) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}

function setLinkHref(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

export function getOfflineLogoDataUrl(logoPath?: string | null): string | null {
  try {
    const data = localStorage.getItem(STORE_LOGO_DATA_KEY);
    if (!data) return null;
    const forStored = localStorage.getItem(STORE_LOGO_FOR_KEY);
    if (logoPath && forStored && forStored !== logoPath) return null;
    return data;
  } catch {
    return null;
  }
}

export function resolveBrandLogoDisplay(logoPath?: string | null): string {
  if (!logoPath || !isCustomStoreLogo(logoPath)) return '';
  const offline = getOfflineLogoDataUrl(logoPath);
  if (offline) return offline;
  return resolveBrandAsset(logoPath);
}

export function snapshotFromStoreApiData(data: {
  name?: string;
  description?: string | null;
  logo?: string | null;
  theme?: Partial<StoreTheme>;
  social?: Record<string, string | null>;
  currency?: string | null;
  currency_symbol?: string | null;
}): StoreBrandSnapshot {
  return {
    name: data.name?.trim() || 'المتجر',
    description: data.description,
    logo: data.logo,
    theme: { ...defaultTheme, ...data.theme },
    social: data.social ?? {},
    currency: data.currency ?? 'ILS',
    currencySymbol: data.currency_symbol?.trim() || '₪',
  };
}

function storeApiBase(): string {
  const base = resolveApiBaseUrl();
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Load brand from cache + refresh from API before React mounts. */
export async function ensureStoreBrandBootstrapped(): Promise<void> {
  bootstrapStoreBrandFromCache();

  try {
    const slug = import.meta.env.VITE_STORE_SLUG || 'jori-store';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${storeApiBase()}/store`, {
      headers: { Accept: 'application/json', 'X-Store-Slug': slug },
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!res.ok) return;
    const payload = await res.json();
    const data = (payload?.data ?? payload) as Parameters<typeof snapshotFromStoreApiData>[0];
    const snap = snapshotFromStoreApiData(data);
    cacheStoreBrand(snap);
    applyStoreTheme(snap.theme);
    applyStoreDocumentMeta(snap);
    void persistLogoForOffline(snap.logo);
  } catch {
    /* offline / API down — keep boot splash without placeholder logo */
  }
}

export function applyStoreDocumentMeta(brand: Pick<StoreBrandSnapshot, 'name' | 'description' | 'logo'>) {
  if (brand.name) {
    document.title = brand.name;
    setMetaContent('apple-mobile-web-app-title', brand.name);
  }
  if (brand.description) {
    setMetaContent('description', brand.description);
  }
  const logoSrc = brand.logo && isCustomStoreLogo(brand.logo)
    ? resolveBrandLogoDisplay(brand.logo)
    : null;
  if (logoSrc) {
    setLinkHref('icon', logoSrc);
    setLinkHref('apple-touch-icon', logoSrc);
  }
}

export async function persistLogoForOffline(logoPath?: string | null): Promise<void> {
  if (!logoPath || !isCustomStoreLogo(logoPath)) {
    try {
      localStorage.removeItem(STORE_LOGO_DATA_KEY);
      localStorage.removeItem(STORE_LOGO_FOR_KEY);
    } catch {
      /* ignore */
    }
    return;
  }

  const url = resolveBrandAsset(logoPath);
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size > 600_000) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    localStorage.setItem(STORE_LOGO_DATA_KEY, dataUrl);
    localStorage.setItem(STORE_LOGO_FOR_KEY, logoPath);

    if ('caches' in window) {
      const cache = await caches.open('jori-store-logo-v1');
      await cache.put(url, new Response(blob));
    }
  } catch {
    /* network / quota */
  }
}

export function resolveBrandAsset(path?: string | null): string {
  if (!path) return DEFAULT_LOGO;
  return absoluteStorageUrl(path) || DEFAULT_LOGO;
}

/** Apply cached theme/logo before React mounts (called from main.tsx). */
export function bootstrapStoreBrandFromCache() {
  const cached = loadCachedStoreBrand();
  if (!cached) return;
  applyStoreTheme({ ...defaultTheme, ...cached.theme });
  applyStoreDocumentMeta(cached);
}
