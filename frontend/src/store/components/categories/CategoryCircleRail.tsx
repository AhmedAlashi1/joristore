import { StoreMediaImage } from '../media/StoreMediaImage';
import { cn } from '../../lib/utils';

type Item = {
  id: number;
  label: string;
  image?: string | null;
  updated_at?: string | null;
  isBranch?: boolean;
};

type Props = {
  items: Item[];
  onSelect: (id: number) => void;
  activeId?: number | null;
  className?: string;
};

export function CategoryCircleRail({ items, onSelect, activeId, className }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'category-circle-rail hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory',
        className,
      )}
    >
      {items.map((cat) => {
        const active = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn('category-circle-tile shrink-0 snap-start', active && 'category-circle-tile-active')}
          >
            <span className={cn('category-circle-img', active && 'category-circle-img-active')}>
              <StoreMediaImage src={cat.image} cacheVersion={cat.updated_at} alt={cat.label} fit="cover" layout="fill" />
              {cat.isBranch ? <span className="category-circle-branch" aria-hidden /> : null}
            </span>
            <span className="category-circle-label">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CategoryCircleRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="category-circle-rail hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="category-circle-tile shrink-0">
          <div className="skeleton-shimmer category-circle-img !border-0" />
          <div className="skeleton-shimmer mt-2 h-3 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}
