import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLocale } from '../../providers/locale-provider';

export type ShopFilterOptions = {
  brands: { id: number; name: string; slug: string }[];
  colors: { name: string; hex?: string | null; count: number }[];
  sizes: { name: string; count: number }[];
};

type ShopFiltersProps = {
  options: ShopFilterOptions;
  brandId: string;
  color: string;
  size: string;
  onBrandId: (v: string) => void;
  onColor: (v: string) => void;
  onSize: (v: string) => void;
  onClear: () => void;
};

export function ShopFilters({
  options,
  brandId,
  color,
  size,
  onBrandId,
  onColor,
  onSize,
  onClear,
}: ShopFiltersProps) {
  const { t } = useLocale();
  const hasActive = Boolean(brandId || color || size);

  return (
    <section className="shop-filters glass-strong space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{t.filters}</h2>
        {hasActive ? (
          <button type="button" onClick={onClear} className="flex items-center gap-1 text-xs font-bold text-[#ea5455]">
            <X size={14} />
            {t.clearFilters}
          </button>
        ) : null}
      </div>

      {options.brands.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-store-muted">{t.filterBrand}</p>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {options.brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onBrandId(brandId === String(b.id) ? '' : String(b.id))}
                className={cn(
                  'filter-chip shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold',
                  brandId === String(b.id) ? 'bg-[var(--primary)] text-white' : 'glass',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {options.colors.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-store-muted">{t.filterColor}</p>
          <div className="flex flex-wrap gap-2">
            {options.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => onColor(color === c.name ? '' : c.name)}
                className={cn(
                  'color-swatch h-9 w-9',
                  color === c.name && 'ring-2 ring-[var(--primary)] ring-offset-2',
                )}
                style={{ background: c.hex || '#c8cad8' }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {options.sizes.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-store-muted">{t.filterSize}</p>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => onSize(size === s.name ? '' : s.name)}
                className={cn(
                  'filter-chip min-w-[2.5rem] rounded-xl px-3 py-1.5 text-xs font-bold',
                  size === s.name ? 'bg-[var(--primary)] text-white' : 'glass',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
