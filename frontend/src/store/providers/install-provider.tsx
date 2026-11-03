import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  detectInstallPlatform,
  isIosDevice,
  isStandaloneDisplay,
  type InstallPlatform,
} from '../lib/install-platform';
import { SPLASH_DONE_EVENT } from '../lib/splash-done';
import {
  getDeferredInstallPrompt,
  stashDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/pwa-install-prompt';

const INSTALL_DISMISS_KEY = 'jori-install-dismiss';

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
  /** Browser install dialog when supported; else platform guide (iOS Safari). */
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
      const early = getDeferredInstallPrompt();
      if (early) setDeferred(early);
    };

    syncDeferred();
    const poll = window.setInterval(syncDeferred, 1500);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      stashDeferredInstallPrompt(e);
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
      window.clearInterval(poll);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener(SPLASH_DONE_EVENT, onSplashDone);
    };
  }, [installed, revealInstallUi]);

  const install = useCallback(async () => {
    const promptEvent = deferred ?? getDeferredInstallPrompt();
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
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
    const promptEvent = deferred ?? getDeferredInstallPrompt();
    if (promptEvent) {
      if (!deferred) setDeferred(promptEvent);
      return install();
    }
    setGuideVisible(true);
    return false;
  }, [deferred, install]);

  const value = useMemo<InstallCtx>(() => ({
    guideVisible: guideVisible && !installed,
    bannerVisible: bannerVisible && !installed,
    iconVisible: !installed,
    canNativeInstall: !!(deferred ?? getDeferredInstallPrompt()),
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
