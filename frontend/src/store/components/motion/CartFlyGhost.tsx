import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { buildCartFlyKeyframes, pickFlySize } from '../../lib/store-motion';

type Props = {
  id: string;
  src: string;
  from: DOMRect;
  to: DOMRect;
  delayMs?: number;
  onComplete: (id: string) => void;
};

export function CartFlyGhost({ id, src, from, to, delayMs = 0, onComplete }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const size = pickFlySize(from);
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;

    const run = () => {
      const anim = node.animate(buildCartFlyKeyframes(from, to, size), {
        duration: 680,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      });
      anim.onfinish = () => onComplete(id);
      anim.oncancel = () => onComplete(id);
    };

    if (delayMs > 0) {
      const t = window.setTimeout(run, delayMs);
      return () => window.clearTimeout(t);
    }
    run();
  }, [id, from, to, delayMs, onComplete]);

  return createPortal(
    <div ref={rootRef} className="cart-fly-ghost" aria-hidden>
      <img src={src} alt="" draggable={false} />
    </div>,
    document.body,
  );
}
