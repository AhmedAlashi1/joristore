import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const SPLASH_DONE_EVENT = 'jori-splash-done';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

type InstallCtx = {
  guideVisible: boolean;
  bannerVisible: boolean;
  iconVisible: boolean;
  canNativeInstall: boolean;
  isIosDevice: boolean;
  installed: boolean;
  install: () => Promise<boolean>;
  dismissGuide: () => void;
  dismissBanner: () => void;
  openBanner: () => void;
  openGuide: () => void;
};

const InstallContext = createContext<InstallCtx | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [iconVisible, setIconVisible] = useState(false);
  const [installed] = useState(isStandalone);
  const [isIosDevice] = useState(isIos);

  useEffect(() => {
    if (installed) return;

    const showAfterSplash = () => {
      setIconVisible(true);
      setGuideVisible(true);
      setBannerVisible(true);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIconVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener(SPLASH_DONE_EVENT, showAfterSplash);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener(SPLASH_DONE_EVENT, showAfterSplash);
    };
  }, [installed]);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setGuideVisible(false);
      setBannerVisible(false);
      setIconVisible(false);
      setDeferred(null);
      return true;
    }
    return false;
  }, [deferred]);

  const dismissGuide = useCallback(() => setGuideVisible(false), []);
  const dismissBanner = useCallback(() => setBannerVisible(false), []);
  const openBanner = useCallback(() => { setBannerVisible(true); setGuideVisible(true); }, []);
  const openGuide = useCallback(() => setGuideVisible(true), []);

  const value = useMemo<InstallCtx>(() => ({
    guideVisible: guideVisible && !installed,
    bannerVisible: bannerVisible && !installed,
    iconVisible: iconVisible && !installed,
    canNativeInstall: !!deferred,
    isIosDevice,
    installed,
    install,
    dismissGuide,
    dismissBanner,
    openBanner,
    openGuide,
  }), [guideVisible, bannerVisible, iconVisible, deferred, isIosDevice, installed, install, dismissGuide, dismissBanner, openBanner, openGuide]);

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstall outside InstallProvider');
  return ctx;
}
