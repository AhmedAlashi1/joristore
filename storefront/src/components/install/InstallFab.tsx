import { Download } from 'lucide-react';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';

export function InstallFab() {
  const { iconVisible, openBanner } = useInstall();
  const { t } = useLocale();

  if (!iconVisible) return null;

  return (
    <button
      type="button"
      onClick={openBanner}
      className="install-fab fixed z-[45] flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-[rgba(115,103,240,0.45)] transition-transform active:scale-95"
      style={{ top: 'calc(10px + var(--safe-top))', insetInlineEnd: 'max(12px, calc(50% - 240px + 12px))' }}
      aria-label={t.installButton}
      title={t.installTitle}
    >
      <Download size={20} strokeWidth={2.5} />
      <span className="install-fab-ping absolute inset-0 rounded-2xl bg-[var(--primary)]" aria-hidden />
    </button>
  );
}
