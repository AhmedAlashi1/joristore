import { useStoreBrand } from '../../providers/store-brand-provider';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';

export function OpenInAppBar() {
  const { t } = useLocale();
  const { logo } = useStoreBrand();
  const { iconVisible, installed, openGuide, install, canNativeInstall } = useInstall();

  if (installed || !iconVisible) return null;

  const handleClick = async () => {
    if (canNativeInstall) {
      const ok = await install();
      if (ok) return;
    }
    openGuide();
  };

  return (
    <div className="open-in-app-bar fixed inset-x-0 top-0 z-[45] mx-auto max-w-[480px] px-4 pt-[calc(4px+var(--safe-top))]">
      <button
        type="button"
        onClick={handleClick}
        className="open-in-app-pill mx-auto flex w-fit max-w-full items-center gap-2 rounded-full px-3 py-1.5 shadow-lg transition active:scale-[0.98]"
        aria-label={t.openInApp}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#ffc107]">
          <img src={logo} alt="" className="h-4 w-4 object-contain" />
        </span>
        <span className="truncate text-xs font-semibold text-white">{t.openInApp}</span>
      </button>
    </div>
  );
}
