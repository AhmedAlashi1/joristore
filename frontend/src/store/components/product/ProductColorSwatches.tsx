import { cn } from '../../lib/utils';

export type ColorVariant = {
  id: number;
  name: string;
  color_name?: string | null;
  color_hex?: string | null;
  image?: string | null;
};

type Props = {
  variants: ColorVariant[];
  activeId: number;
  label: string;
  onSelect: (variant: ColorVariant, direction: 1 | -1) => void;
};

export function ProductColorSwatches({ variants, activeId, label, onSelect }: Props) {
  const activeIndex = variants.findIndex((v) => v.id === activeId);

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-store-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v, index) => {
          const active = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              aria-label={v.color_name || v.name}
              aria-pressed={active}
              onClick={() => {
                if (active || activeIndex < 0) return;
                const direction: 1 | -1 = index > activeIndex ? 1 : -1;
                onSelect(v, direction);
              }}
              className={cn(
                'color-swatch transition-transform active:scale-90',
                active && 'ring-2 ring-[var(--primary)] scale-110',
              )}
              style={{ background: v.color_hex || '#c8cad8' }}
              title={v.color_name || v.name}
            />
          );
        })}
      </div>
    </div>
  );
}
