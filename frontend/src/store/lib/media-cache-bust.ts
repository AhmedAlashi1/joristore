const BUST_KEY = 'jori-media-bust';

export function getMediaCacheBust(): string {
  try {
    return sessionStorage.getItem(BUST_KEY) || '';
  } catch {
    return '';
  }
}

/** Invalidate cached category/product images (PWA + browser) after admin media changes. */
export async function bumpMediaCacheVersion(): Promise<void> {
  try {
    sessionStorage.setItem(BUST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  if (typeof caches === 'undefined') return;
  await Promise.all([
    caches.delete('store-media'),
    caches.delete('store-media-remote'),
  ]).catch(() => undefined);
}
