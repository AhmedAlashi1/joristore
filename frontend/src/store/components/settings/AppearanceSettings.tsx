import { useAppearance, type ColorScheme } from '../../providers/appearance-provider';
import { useLocale } from '../../providers/locale-provider';

export function AppearanceSettings() {
  const { t } = useLocale();
  const { scheme, setScheme } = useAppearance();

  return (
    <div className="glass rounded-xl p-2">
      <p className="mb-2 px-2 text-xs font-semibold text-store-muted">{t.appearance}</p>
      <div className="flex gap-1">
        {(['light', 'dark', 'system'] as ColorScheme[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setScheme(mode)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              scheme === mode ? 'bg-[var(--primary)] text-white shadow-md' : 'text-store-muted'
            }`}
          >
            {mode === 'light' ? t.appearanceLight : mode === 'dark' ? t.appearanceDark : t.appearanceSystem}
          </button>
        ))}
      </div>
    </div>
  );
}
