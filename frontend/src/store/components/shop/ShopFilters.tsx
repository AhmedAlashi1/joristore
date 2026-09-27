import { ArrowDownWideNarrow, ArrowUpWideNarrow, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useLocale } from '../../providers/locale-provider';

export type ShopFilterOptions = {
  brands: { id: number; name: string; slug: string }[];
  colors: { name: string; hex?: string | null; count: number }[];
  sizes: { name: string; count: number }[];
};

export type ShopSort = '' | 'price_asc' | 'price_desc';

type ShopFiltersProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ShopFilterOptions;
  brandId: string;
  color: string;
  size: string;
  sort: ShopSort;
  onBrandId: (v: string) => void;
  onColor: (v: string) => void;
  onSize: (v: string) => void;
  onSort: (v: ShopSort) => void;
  onClear: () => void;
};

export function ShopFiltersBar({
  activeCount,
  onOpen,
  sort,
  brandId,
  color,
  size,
  options,
  onBrandId,
  onColor,
  onSize,
  onSort,
}: {
  activeCount: number;
  onOpen: () => void;
  sort: ShopSort;
  brandId: string;
  color: string;
  size: string;
  options: ShopFilterOptions;
  onBrandId: (v: string) => void;
  onColor: (v: string) => void;
  onSize: (v: string) => void;
  onSort: (v: ShopSort) => void;
}) {
  const { t } = useLocale();

  const brandName = options.brands.find((b) => String(b.id) === brandId)?.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="glass-interactive inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[var(--fg)] shadow-sm"
      >
        <SlidersHorizontal size={16} className="text-[var(--primary)]" />
        {t.filtersAndSort}
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      <div className="hide-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
        {sort === 'price_asc' ? (
          <FilterChip label={t.sortPriceLowHigh} onRemove={() => onSort('')} />
        ) : null}
        {sort === 'price_desc' ? (
          <FilterChip label={t.sortPriceHighLow} onRemove={() => onSort('')} />
        ) : null}
        {brandName ? (
          <FilterChip label={brandName} onRemove={() => onBrandId('')} />
        ) : null}
        {color ? (
          <FilterChip label={color} onRemove={() => onColor('')} />
        ) : null}
        {size ? (
          <FilterChip label={size} onRemove={() => onSize('')} />
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--primary)]">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-black/10" aria-label="Remove">
        <X size={12} />
      </button>
    </span>
  );
}

export function ShopFilters({
  open,
  onOpenChange,
  options,
  brandId,
  color,
  size,
  sort,
  onBrandId,
  onColor,
  onSize,
  onSort,
  onClear,
}: ShopFiltersProps) {
  const { t } = useLocale();
  const hasActive = Boolean(brandId || color || size || sort);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] flex flex-col justify-end transition-opacity duration-300',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label={t.dismiss}
        onClick={() => onOpenChange(false)}
      />

      <div
        className={cn(
          'relative max-h-[min(88vh,640px)] overflow-hidden rounded-t-3xl border border-white/20 bg-[var(--bg)] shadow-[0_-12px_40px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal={open}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#c8cad8]/60" aria-hidden />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-2">
          <h2 className="text-base font-bold">{t.filtersAndSort}</h2>
          <div className="flex items-center gap-2">
            {hasActive ? (
              <button type="button" onClick={onClear} className="text-xs font-bold text-[#ea5455]">
                {t.clearFilters}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl glass"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="hide-scrollbar space-y-5 overflow-y-auto px-4 pb-8 pt-1">
          <section>
            <p className="mb-2 text-xs font-semibold text-store-muted">{t.sortByPrice}</p>
            <div className="grid grid-cols-2 gap-2">
              <SortOption
                active={sort === 'price_asc'}
                icon={<ArrowUpWideNarrow size={16} />}
                label={t.sortPriceLowHigh}
                onClick={() => onSort(sort === 'price_asc' ? '' : 'price_asc')}
              />
              <SortOption
                active={sort === 'price_desc'}
                icon={<ArrowDownWideNarrow size={16} />}
                label={t.sortPriceHighLow}
                onClick={() => onSort(sort === 'price_desc' ? '' : 'price_desc')}
              />
            </div>
          </section>

          {options.brands.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold text-store-muted">{t.filterBrand}</p>
              <div className="flex flex-wrap gap-2">
                {options.brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBrandId(brandId === String(b.id) ? '' : String(b.id))}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-xs font-bold transition',
                      brandId === String(b.id)
                        ? 'bg-[var(--primary)] text-white shadow-md'
                        : 'glass text-[var(--fg)]',
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {options.colors.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold text-store-muted">{t.filterColor}</p>
              <div className="flex flex-wrap gap-2.5">
                {options.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => onColor(color === c.name ? '' : c.name)}
                    className={cn(
                      'color-swatch h-10 w-10 transition',
                      color === c.name && 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]',
                    )}
                    style={{ background: c.hex || '#c8cad8' }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {options.sizes.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold text-store-muted">{t.filterSize}</p>
              <div className="flex flex-wrap gap-2">
                {options.sizes.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onSize(size === s.name ? '' : s.name)}
                    className={cn(
                      'min-w-[2.75rem] rounded-full px-3.5 py-2 text-xs font-bold transition',
                      size === s.name ? 'bg-[var(--primary)] text-white' : 'glass',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => onOpenChange(false)}
          >
            {t.showResults}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortOption({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold transition',
        active ? 'bg-[var(--primary)] text-white shadow-md' : 'glass text-[var(--fg)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
