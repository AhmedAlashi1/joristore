import { Download, Monitor, Share, Smartphone, X } from 'lucide-react';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';

export function InstallGuideModal() {
  const { t, locale } = useLocale();
  const { guideVisible, canNativeInstall, platform, install, dismissGuide } = useInstall();
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
          {platform === 'ios' ? (
            <>
              <p className="font-bold">{ar ? 'iPhone / iPad (Safari)' : 'iPhone / iPad (Safari)'}</p>
              <ol className="list-decimal space-y-2 ps-5 text-[#6f6b7d]">
                <li className="flex items-center gap-2">
                  <Share size={16} className="shrink-0 text-[var(--primary)]" />
                  {ar ? 'زر المشاركة في الأسفل' : 'Tap the Share button'}
                </li>
                <li>{ar ? '«إضافة إلى الشاشة الرئيسية»' : 'Add to Home Screen'}</li>
                <li>{ar ? '«إضافة»' : 'Tap Add'}</li>
              </ol>
            </>
          ) : null}

          {platform === 'android' ? (
            <>
              <p className="font-bold">{ar ? 'Android (Chrome)' : 'Android (Chrome)'}</p>
              {canNativeInstall ? (
                <p className="text-[#6f6b7d]">
                  {ar ? 'اضغط «تثبيت الآن» بالأسفل، أو من قائمة ⋮ → تثبيت التطبيق.' : 'Tap Install below, or Menu ⋮ → Install app.'}
                </p>
              ) : (
                <ol className="list-decimal space-y-2 ps-5 text-[#6f6b7d]">
                  <li>{ar ? 'قائمة المتصفح ⋮' : 'Browser menu ⋮'}</li>
                  <li>{ar ? '«تثبيت التطبيق» أو «Add to Home screen»' : 'Install app / Add to Home screen'}</li>
                  <li>{ar ? '«تثبيت»' : 'Install'}</li>
                </ol>
              )}
            </>
          ) : null}

          {platform === 'desktop' ? (
            <>
              <p className="flex items-center gap-2 font-bold">
                <Monitor size={18} className="text-[var(--primary)]" />
                {ar ? 'Windows / Mac (Chrome أو Edge)' : 'Windows / Mac (Chrome or Edge)'}
              </p>
              {canNativeInstall ? (
                <p className="text-[#6f6b7d]">
                  {ar ? 'اضغط «تثبيت الآن»، أو من شريط العنوان أيقونة التثبيت ⊕.' : 'Tap Install below, or use the ⊕ icon in the address bar.'}
                </p>
              ) : (
                <ol className="list-decimal space-y-2 ps-5 text-[#6f6b7d]">
                  <li>{ar ? 'Chrome/Edge: قائمة ⋮ أو …' : 'Chrome/Edge: menu ⋮ or …'}</li>
                  <li>{ar ? '«تثبيت [اسم المتجر]» / Install app' : 'Install app / Install [store name]'}</li>
                  <li>{ar ? '«تثبيت» للتأكيد' : 'Confirm Install'}</li>
                </ol>
              )}
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {canNativeInstall ? (
            <button type="button" className="btn-primary w-full" onClick={() => void install()}>
              <Download size={18} />
              {t.installButton}
            </button>
          ) : null}
          <button type="button" className="glass w-full rounded-xl py-3 text-sm font-semibold" onClick={dismissGuide}>
            {ar ? 'فهمت' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
