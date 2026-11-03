import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export type MultiSelectOption = { id: number; name: string };

type SearchableMultiSelectProps = {
  options: MultiSelectOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
};

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No results',
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = useMemo(
    () => options.filter((o) => value.includes(o.id)).map((o) => o.name),
    [options, value],
  );

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-input flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm"
      >
        <span className={cn('min-w-0 flex-1 truncate', selectedLabels.length === 0 && 'text-[#8a8da8]')}>
          {selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length <= 2
              ? selectedLabels.join(' · ')
              : `${selectedLabels.slice(0, 2).join(' · ')} +${selectedLabels.length - 2}`}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-60 transition', open && 'rotate-180')} />
      </button>

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((id) => {
            const name = options.find((o) => o.id === id)?.name;
            if (!name) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-lg bg-[#7367f0]/12 px-2 py-0.5 text-xs font-medium text-[#5e50ee] dark:text-[#a29bfe]"
              >
                {name}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-black/10"
                  aria-label="Remove"
                  onClick={() => toggle(id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#7367f0]/20 bg-white shadow-xl dark:border-white/15 dark:bg-[#252538]">
          <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
            <Search className="h-4 w-4 shrink-0 text-[#8a8da8]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-[#8a8da8]"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[#8a8da8]">{emptyLabel}</li>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-[#7367f0]/8',
                        checked && 'bg-[#7367f0]/10 font-medium',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          checked ? 'border-[#7367f0] bg-[#7367f0] text-white' : 'border-[#c8c8d8]',
                        )}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span className="truncate">{o.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
