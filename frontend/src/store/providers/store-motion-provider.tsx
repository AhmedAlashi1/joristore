import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { CartFlyGhost } from '../components/motion/CartFlyGhost';
import {
  hapticLight,
  motionReduced,
  resolveFlyImageUrl,
  resolveFlySourceRect,
} from '../lib/store-motion';

type FlyTask = {
  id: string;
  src: string;
  from: DOMRect;
  to: DOMRect;
  delayMs: number;
};

type FlyToCartOptions = {
  imageUrl?: string | null;
  fromEl?: Element | null;
  /** Extra flying clones (e.g. quantity). Capped internally. */
  bursts?: number;
};

type FlyToWishlistOptions = {
  fromEl?: Element | null;
};

type StoreMotionCtx = {
  cartTargetRef: RefObject<HTMLAnchorElement | null>;
  wishlistTargetRef: RefObject<HTMLAnchorElement | null>;
  flyToCart: (opts: FlyToCartOptions) => void;
  flyToWishlist: (opts: FlyToWishlistOptions) => void;
};

const StoreMotionContext = createContext<StoreMotionCtx | null>(null);

function pulseTarget(el: HTMLElement | null, className: string) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), 620);
}

function popFlySource(fromEl?: Element | null) {
  const box =
    fromEl?.closest('[data-fly-source]')
    ?? fromEl?.closest('.product-card-media');
  if (box instanceof HTMLElement) pulseTarget(box, 'cart-fly-source-pop');
}

export function StoreMotionProvider({ children }: { children: ReactNode }) {
  const cartTargetRef = useRef<HTMLAnchorElement | null>(null);
  const wishlistTargetRef = useRef<HTMLAnchorElement | null>(null);
  const [flies, setFlies] = useState<FlyTask[]>([]);

  const removeFly = useCallback((id: string) => {
    setFlies((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const flyToCart = useCallback((opts: FlyToCartOptions) => {
    const target = cartTargetRef.current ?? document.querySelector<HTMLElement>('[data-cart-fly-target]');
    if (!target) return;

    popFlySource(opts.fromEl ?? null);
    pulseTarget(target, 'cart-fly-landing');

    if (motionReduced()) {
      hapticLight();
      return;
    }

    const from = resolveFlySourceRect(opts.fromEl ?? null);
    const to = target.getBoundingClientRect();
    if (!from || to.width < 2) return;

    let src = resolveFlyImageUrl(opts.imageUrl);
    if (!src && opts.fromEl) {
      const img = opts.fromEl.querySelector('img');
      if (img?.src) src = img.src;
    }
    if (!src) {
      hapticLight();
      return;
    }

    const count = Math.min(Math.max(1, opts.bursts ?? 1), 5);
    const batch: FlyTask[] = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      src,
      from,
      to,
      delayMs: i * 90,
    }));
    setFlies((prev) => [...prev, ...batch]);
    hapticLight();
  }, []);

  const flyToWishlist = useCallback((opts: FlyToWishlistOptions) => {
    const target = wishlistTargetRef.current ?? document.querySelector<HTMLElement>('[data-wishlist-fly-target]');
    if (!target) return;

    pulseTarget(target, 'wishlist-fly-landing');
    if (motionReduced()) return;

    const from = resolveFlySourceRect(opts.fromEl ?? null);
    if (!from) return;

    const heart = document.createElement('div');
    heart.className = 'wishlist-fly-heart';
    heart.textContent = '♥';
    document.body.appendChild(heart);

    const fx = from.left + from.width / 2;
    const fy = from.top + from.height / 2;
    const tr = target.getBoundingClientRect();
    const tx = tr.left + tr.width / 2;
    const ty = tr.top + tr.height / 2;
    const midY = Math.min(fy, ty) - 64;

    heart.animate(
      [
        { transform: `translate(${fx}px, ${fy}px) scale(0.4)`, opacity: 0.2 },
        { transform: `translate(${(fx + tx) / 2}px, ${midY}px) scale(1.15)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.35)`, opacity: 0 },
      ],
      { duration: 580, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    ).onfinish = () => heart.remove();
  }, []);

  const onGhostComplete = useCallback(
    (id: string) => {
      removeFly(id);
      const target = cartTargetRef.current ?? document.querySelector<HTMLElement>('[data-cart-fly-target]');
      pulseTarget(target, 'cart-fly-landing');
    },
    [removeFly],
  );

  const value = useMemo(
    () => ({ cartTargetRef, wishlistTargetRef, flyToCart, flyToWishlist }),
    [flyToCart, flyToWishlist],
  );

  return (
    <StoreMotionContext.Provider value={value}>
      {children}
      {flies.map((f) => (
        <CartFlyGhost
          key={f.id}
          id={f.id}
          src={f.src}
          from={f.from}
          to={f.to}
          delayMs={f.delayMs}
          onComplete={onGhostComplete}
        />
      ))}
    </StoreMotionContext.Provider>
  );
}

export function useStoreMotion() {
  const ctx = useContext(StoreMotionContext);
  if (!ctx) throw new Error('useStoreMotion outside StoreMotionProvider');
  return ctx;
}
