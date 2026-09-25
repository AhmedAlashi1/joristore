import { Download, Share, Smartphone, X } from 'lucide-react';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';

export function InstallGuideModal() {
  const { t, locale } = useLocale();
  const { guideVisible, canNativeInstall, isIosDevice, install, dismissGuide } = useInstall();
  const ar = locale === 'ar';

  if (!guideVisible) return null;

  return (
    <div className="install-guide-backdrop fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="install-guide-panel glass-strong w-full max-w-[420px] rounded-3xl p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg">
              <Smartphone size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t.installTitle}</h2>
              <p className="text-xs text-[#8a8da8]">{t.installSubtitle}</p>
            </div>
          </div>
          <button type="button" onClick={dismissGuide} className="rounded-lg p-1 text-[#8a8da8]"><X size={20} /></button>
        </div>

        <div className="space-y-3 rounded-2xl bg-white/40 p-4 text-sm dark:bg-white/5">
          {isIosDevice ? (
            <>
              <p className="font-bold">{ar ? 'على iPhone / iPad:' : 'On iPhone / iPad:'}</p>
              <ol className="list-decimal space-y-2 ps-5 text-[#6f6b7d]">
                <li className="flex items-center gap-2"><Share size={16} className="shrink-0 text-[var(--primary)]" /> {ar ? 'اضغط زر المشاركة في الأسفل' : 'Tap the Share button'}</li>
                <li>{ar ? 'اختر «إضافة إلى الشاشة الرئيسية»' : 'Choose Add to Home Screen'}</li>
                <li>{ar ? 'اضغط «إضافة» في الأعلى' : 'Tap Add in the top corner'}</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-bold">{ar ? 'على Android / Chrome:' : 'On Android / Chrome:'}</p>
              <ol className="list-decimal space-y-2 ps-5 text-[#6f6b7d]">
                <li>{ar ? 'اضغط قائمة المتصفح ⋮' : 'Tap browser menu ⋮'}</li>
                <li>{ar ? 'اختر «تثبيت التطبيق» أو «Add to Home screen»' : 'Choose Install app / Add to Home screen'}</li>
                <li>{ar ? 'اضغط «تثبيت» للتأكيد' : 'Tap Install to confirm'}</li>
              </ol>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {canNativeInstall ? (
            <button type="button" className="btn-primary w-full" onClick={() => void install()}>
              <Download size={18} />
              {t.installButton}
            </button>
          ) : null}
          <button type="button" className="glass w-full rounded-xl py-3 text-sm font-semibold" onClick={dismissGuide}>
            {ar ? 'فهمت، لاحقاً' : 'Got it, later'}
          </button>
        </div>
      </div>
    </div>
  );
}
