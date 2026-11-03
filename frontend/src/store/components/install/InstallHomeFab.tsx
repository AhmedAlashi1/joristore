import { Download } from 'lucide-react';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';

/** Floating «add to home screen» — visible until the PWA is installed. */
export function InstallHomeFab() {
  const { installed, requestInstall } = useInstall();
  const { t } = useLocale();

  if (installed) return null;

  return (
    <button
      type="button"
      onClick={() => void requestInstall()}
      className="assist-fab-btn assist-fab-install"
      aria-label={t.installButton}
      title={t.installTitle}
    >
      <span className="assist-fab-motion assist-fab-motion-install" aria-hidden>
        <Download size={22} strokeWidth={2.5} className="text-white" />
      </span>
    </button>
  );
}
