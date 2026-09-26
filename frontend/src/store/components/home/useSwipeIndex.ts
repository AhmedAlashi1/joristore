import { useCallback, useRef, type TouchEvent } from 'react';

const SWIPE_THRESHOLD = 48;

export function useSwipeIndex(length: number, active: number, setActive: (i: number) => void) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const goPrev = useCallback(() => {
    if (length <= 1) return;
    setActive((active - 1 + length) % length);
  }, [active, length, setActive]);

  const goNext = useCallback(() => {
    if (length <= 1) return;
    setActive((active + 1) % length);
  }, [active, length, setActive]);

  const onTouchStart = (e: TouchEvent) => {
    if (length <= 1) return;
    tracking.current = true;
    startX.current = e.touches[0]?.clientX ?? 0;
    startY.current = e.touches[0]?.clientY ?? 0;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!tracking.current || length <= 1) return;
    tracking.current = false;
    const endX = e.changedTouches[0]?.clientX ?? startX.current;
    const endY = e.changedTouches[0]?.clientY ?? startY.current;
    const dx = endX - startX.current;
    const dy = endY - startY.current;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return { onTouchStart, onTouchEnd, goPrev, goNext };
}
