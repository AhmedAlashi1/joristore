import { Download, Share, Smartphone, X } from 'lucide-react';
import { useEffect } from 'react';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';

export function InstallBanner() {
  const { t } = useLocale();
  const { bannerVisible, canNativeInstall, isIosDevice, install, dismissBanner, openGuide } = useInstall();

  useEffect(() => {
    document.documentElement.style.setProperty('--install-h', bannerVisible ? '132px' : '0px');
    return () => document.documentElement.style.setProperty('--install-h', '0px');
  }, [bannerVisible]);

  if (!bannerVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-40 mx-auto max-w-[480px] px-3',
        'bottom-[calc(var(--nav-h)+var(--safe-bottom)+8px)]',
      )}
    >
      <div className="glass-strong card-pop flex items-start gap-3 rounded-2xl p-3.5">
        <div className="float-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Smartphone size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">{t.installTitle}</p>
          <p className="mt-0.5 text-xs text-[#6f6b7d]">{t.installSubtitle}</p>
          {isIosDevice && !canNativeInstall ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)]">
              <Share size={14} />
              {t.installIosHint}
            </p>
          ) : null}
          {!isIosDevice && !canNativeInstall ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)]">
              <Download size={14} />
              {t.installDesktopHint}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={dismissBanner} className="shrink-0 rounded-lg p-1 text-[#8a8da8]" aria-label={t.dismiss}>
          <X size={18} />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        {canNativeInstall ? (
          <button type="button" className="btn-primary flex-1" onClick={() => void install()}>
            <Download size={18} />
            {t.installButton}
          </button>
        ) : null}
        {isIosDevice && !canNativeInstall ? (
          <button type="button" className="btn-primary flex-1" onClick={openGuide}>
            <Share size={18} />
            {t.installGuideButton}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismissBanner}
          className="glass flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-[#6f6b7d]"
        >
          {t.dismiss}
        </button>
      </div>
    </div>
  );
}
