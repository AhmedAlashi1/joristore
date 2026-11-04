import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export type SelectOption = { id: number; name: string };

type SearchableSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No results',
  className,
}: SearchableSelectProps) {
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

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return options.find((o) => String(o.id) === value)?.name ?? null;
  }, [options, value]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-[12rem]', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="admin-form-input glass-input flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm md:min-w-[200px]"
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedLabel && 'text-[#8a8da8]')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-60 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-xl border border-[#7367f0]/20 bg-white shadow-xl dark:border-white/15 dark:bg-[#252538]">
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
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className={cn(
                  'flex w-full rounded-lg px-3 py-2 text-start text-sm transition hover:bg-[#7367f0]/8',
                  !value && 'bg-[#7367f0]/10 font-medium',
                )}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[#8a8da8]">{emptyLabel}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(String(o.id))}
                    className={cn(
                      'flex w-full truncate rounded-lg px-3 py-2 text-start text-sm transition hover:bg-[#7367f0]/8',
                      value === String(o.id) && 'bg-[#7367f0]/10 font-medium',
                    )}
                  >
                    {o.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
