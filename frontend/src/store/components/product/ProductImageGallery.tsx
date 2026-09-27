import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSwipeIndex } from '../home/useSwipeIndex';
import { StoreMediaImage } from '../media/StoreMediaImage';
import { cn, resolveMediaUrl } from '../../lib/utils';

type ProductImageGalleryProps = {
  name: string;
  image?: string | null;
  images?: string[] | null;
};

export function ProductImageGallery({ name, image, images }: ProductImageGalleryProps) {
  const slides = useMemo(() => {
    const fromApi = (images ?? []).filter(Boolean) as string[];
    if (fromApi.length) return fromApi;
    if (image) return [image];
    return [];
  }, [image, images]);

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setActive(0);
  }, [slides.join('|')]);

  useEffect(() => {
    if (!lightbox) setZoomed(false);
  }, [lightbox, active]);

  const { onTouchStart, onTouchEnd, goPrev, goNext } = useSwipeIndex(slides.length, active, setActive);

  if (slides.length === 0) {
    return (
      <div className="flex min-h-[240px] w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-soft)] to-transparent">
        <StoreMediaImage src={null} alt={name} className="max-h-full max-w-full p-6" fit="contain" />
      </div>
    );
  }

  const activeSrc = slides[active] ?? slides[0];

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-neutral-100">
        <div
          className="relative w-full touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            className="block w-full"
            onClick={() => setLightbox(true)}
            aria-label={name}
          >
            <StoreMediaImage
              key={activeSrc}
              src={activeSrc}
              alt={name}
              layout="intrinsic"
              className="max-h-[min(70vh,520px)] w-full"
            />
          </button>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute start-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
              </button>
              <button
                type="button"
                className="absolute end-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5 rtl:rotate-180" />
              </button>
              <span className="absolute bottom-3 end-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">
                {active + 1}/{slides.length}
              </span>
            </>
          ) : null}

          <span className="pointer-events-none absolute bottom-3 start-3 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
            <ZoomIn className="h-3 w-3" />
            تكبير
          </span>
        </div>

        {slides.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-2">
            {slides.map((src, i) => (
              <button
                key={`thumb-${src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white/30 transition',
                  i === active ? 'border-[var(--primary)]' : 'border-transparent opacity-70',
                )}
              >
                <StoreMediaImage src={src} alt="" className="max-h-full max-w-full" fit="contain" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="truncate pe-4 text-sm font-semibold">{name}</span>
            <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setLightbox(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => setZoomed((z) => !z)}
          >
            <img
              src={resolveMediaUrl(slides[active])}
              alt={name}
              decoding="async"
              className={cn(
                'max-h-full max-w-full object-contain transition-transform duration-200',
                zoomed ? 'scale-[2]' : 'scale-100',
              )}
              draggable={false}
            />
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white"
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                >
                  <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white"
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                >
                  <ChevronRight className="h-6 w-6 rtl:rotate-180" />
                </button>
              </>
            ) : null}
          </div>

          <p className="pb-6 text-center text-xs text-white/70">
            {slides.length > 1 ? `${active + 1} / ${slides.length} · ` : ''}
            اضغط للتكبير / التصغير · اسحب للتقليب
          </p>
        </div>
      ) : null}
    </>
  );
}
