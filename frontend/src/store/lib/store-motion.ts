import { resolveMediaUrl } from './utils';
import { normalizeProductImagePath } from './product-image';

export function motionReduced(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveFlyImageUrl(raw?: string | null): string | null {
  const path = normalizeProductImagePath(raw);
  if (!path) return null;
  return resolveMediaUrl(path);
}

/** Prefer product image box; fallback to nearest img or element rect. */
export function resolveFlySourceRect(fromEl?: Element | null): DOMRect | null {
  if (!fromEl || typeof document === 'undefined') return null;

  const scoped =
    fromEl.closest('[data-fly-source]')
    ?? fromEl.querySelector('[data-fly-source]')
    ?? fromEl.closest('.product-card-media')
    ?? fromEl.querySelector('.product-card-media');

  const img = (scoped ?? fromEl).querySelector?.('img') ?? (fromEl instanceof HTMLImageElement ? fromEl : null);
  const target = (img as Element | null) ?? scoped ?? fromEl;
  const rect = target.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}

export function hapticLight() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

type Point = { x: number; y: number };

function arcControl(from: Point, to: Point): Point {
  const lift = Math.min(140, Math.abs(from.y - to.y) * 0.45 + 72);
  const sway = (from.x - to.x) * 0.08;
  return {
    x: (from.x + to.x) / 2 + sway,
    y: Math.min(from.y, to.y) - lift,
  };
}

export function buildCartFlyKeyframes(from: DOMRect, to: DOMRect, size: number): Keyframe[] {
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const mid = arcControl({ x: fx, y: fy }, { x: tx, y: ty });
  const half = size / 2;

  const at = (x: number, y: number, scale: number, rotate: number, opacity: number): Keyframe => ({
    transform: `translate3d(${x - half}px, ${y - half}px, 0) scale(${scale}) rotate(${rotate}deg)`,
    opacity,
  });

  return [
    { ...at(fx, fy, 1, 0, 1), filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.45))' },
    { ...at(mid.x, mid.y, 0.78, 16, 1), offset: 0.52 },
    { ...at(tx, ty, 0.12, -18, 0.92), filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' },
  ];
}

export function pickFlySize(from: DOMRect): number {
  return Math.round(Math.min(Math.max(from.width, from.height), 88));
}
