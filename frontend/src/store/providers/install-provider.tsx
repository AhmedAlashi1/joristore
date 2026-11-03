import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  detectInstallPlatform,
  isIosDevice,
  isStandaloneDisplay,
  type InstallPlatform,
} from '../lib/install-platform';
import { SPLASH_DONE_EVENT } from '../lib/splash-done';

const INSTALL_DISMISS_KEY = 'jori-install-dismiss';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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
  platform: InstallPlatform;
  installed: boolean;
  install: () => Promise<boolean>;
  /** Native prompt when available; otherwise opens platform guide (iOS / manual). */
  requestInstall: () => Promise<boolean>;
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
  const [installed] = useState(isStandaloneDisplay);
  const [iosDevice] = useState(() => isIosDevice());
  const [platform] = useState(detectInstallPlatform);

  const revealInstallUi = useCallback(() => {
    if (installed) return;
    if (!installDismissed()) setBannerVisible(true);
  }, [installed]);

  useEffect(() => {
    if (installed) return;

    const syncDeferred = () => {
      const early = window.__deferredInstallPrompt;
      if (early) {
        setDeferred(early as BeforeInstallPromptEvent);
      }
    };

    syncDeferred();

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
    } else {
      // Fallback if splash event already ran before this provider mounted
      queueMicrotask(() => revealInstallUi());
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

  const requestInstall = useCallback(async () => {
    if (deferred) {
      return install();
    }
    setGuideVisible(true);
    return false;
  }, [deferred, install]);

  const value = useMemo<InstallCtx>(() => ({
    guideVisible: guideVisible && !installed,
    bannerVisible: bannerVisible && !installed,
    iconVisible: !installed,
    canNativeInstall: !!deferred,
    isIosDevice: iosDevice,
    platform,
    installed,
    install,
    requestInstall,
    dismissGuide,
    dismissBanner,
    openBanner,
    openGuide,
  }), [guideVisible, bannerVisible, deferred, iosDevice, platform, installed, install, requestInstall, dismissGuide, dismissBanner, openBanner, openGuide]);

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstall outside InstallProvider');
  return ctx;
}

/** @deprecated import from ../lib/splash-done */
export { SPLASH_DONE_EVENT };
