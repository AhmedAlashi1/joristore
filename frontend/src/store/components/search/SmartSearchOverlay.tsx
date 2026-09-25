import { Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard, type ProductCardData } from '../product/ProductCard';
import { storeApi, unwrap } from '../../lib/api';
import { useLocale } from '../../providers/locale-provider';

type SmartSearchResult = {
  query: string;
  summary: string;
  keywords: string[];
  ai_used: boolean;
  products: ProductCardData[];
};

type SmartSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function SmartSearchOverlay({ open, onClose }: SmartSearchOverlayProps) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartSearchResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setResult(null);
      setError('');
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  if (!open) return null;

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const res = await storeApi.smartSearch(q, locale);
      setResult(unwrap<SmartSearchResult>(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.searchFailed);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const openAllInShop = () => {
    const q = query.trim();
    if (!q) return;
    onClose();
    navigate(`/shop?smart=${encodeURIComponent(q)}`);
  };

  return (
    <div className="search-overlay fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="search-panel absolute inset-x-0 top-0 mx-auto flex max-h-[92dvh] max-w-[480px] flex-col px-4 pt-[calc(12px+var(--safe-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong flex items-center gap-2 rounded-2xl px-3 py-2 shadow-xl">
          <Sparkles size={18} className="shrink-0 text-[var(--primary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch();
              if (e.key === 'Escape') onClose();
            }}
            placeholder={t.smartSearchPlaceholder}
            className="w-full bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-store-muted">
            <X size={18} />
          </button>
        </div>

        <button type="button" onClick={() => void runSearch()} disabled={loading || !query.trim()} className="btn-primary mt-3 w-full py-2.5 text-sm">
          {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.smartSearch}
        </button>

        {error ? <p className="mt-3 text-center text-xs font-semibold text-[#ea5455]">{error}</p> : null}

        {result ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-6">
            <div className="glass mb-3 rounded-2xl p-3 text-sm">
              <p className="font-bold text-[var(--fg)]">{result.ai_used ? t.smartSearchAi : t.smartSearchLocal}</p>
              {result.summary ? <p className="mt-1 text-store-muted">{result.summary}</p> : null}
              {result.keywords.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                      {k}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {result.products.length === 0 ? (
              <p className="text-center text-sm text-store-muted">{t.noProducts}</p>
            ) : (
              <>
                <div className="product-grid">
                  {result.products.slice(0, 6).map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} compact />
                  ))}
                </div>
                {result.products.length > 6 ? (
                  <button type="button" onClick={openAllInShop} className="mt-3 w-full text-sm font-bold text-[var(--primary)]">
                    {t.viewAllResults}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
