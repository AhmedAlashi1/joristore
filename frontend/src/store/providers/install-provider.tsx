import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SPLASH_DONE_EVENT } from '../lib/splash-done';

const INSTALL_DISMISS_KEY = 'jori-install-dismiss';

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

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function shouldOfferInstall() {
  return isMobileDevice() || isIos();
}

function installDismissed() {
  try {
    return sessionStorage.getItem(INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
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

  const revealInstallUi = useCallback(() => {
    if (installed || installDismissed()) return;
    if (!shouldOfferInstall()) return;

    setIconVisible(true);
    setBannerVisible(true);
  }, [installed]);

  useEffect(() => {
    if (installed) return;

    const early = window.__deferredInstallPrompt;
    if (early) {
      setDeferred(early as BeforeInstallPromptEvent);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferred(e as BeforeInstallPromptEvent);
      revealInstallUi();
    };

    const onSplashDone = () => revealInstallUi();

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener(SPLASH_DONE_EVENT, onSplashDone);

    if (window.__joriSplashDone) {
      revealInstallUi();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener(SPLASH_DONE_EVENT, onSplashDone);
    };
  }, [installed, revealInstallUi]);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setGuideVisible(false);
      setBannerVisible(false);
      setIconVisible(false);
      setDeferred(null);
      window.__deferredInstallPrompt = null;
      return true;
    }
    return false;
  }, [deferred]);

  const persistDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(INSTALL_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const dismissGuide = useCallback(() => setGuideVisible(false), []);
  const dismissBanner = useCallback(() => {
    persistDismiss();
    setBannerVisible(false);
  }, [persistDismiss]);
  const openBanner = useCallback(() => {
    setBannerVisible(true);
    setGuideVisible(true);
  }, []);
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

/** @deprecated import from ../lib/splash-done */
export { SPLASH_DONE_EVENT };
