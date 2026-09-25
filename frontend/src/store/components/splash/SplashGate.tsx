import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { dispatchSplashDone } from '../../lib/splash-done';
import { isCustomStoreLogo } from '../../lib/store-brand';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { SplashScreen } from './SplashScreen';

function BootShell() {
  return (
    <div
      className="fixed inset-0 z-[100] min-h-dvh"
      style={{ background: 'var(--bg, #f3f4fb)' }}
      aria-hidden
    />
  );
}

export function SplashGate({ children }: { children: ReactNode }) {
  const { logo, loaded } = useStoreBrand();
  const [ready, setReady] = useState(false);
  const onComplete = useCallback(() => {
    dispatchSplashDone();
    setReady(true);
  }, []);

  const customLogo = isCustomStoreLogo(logo);

  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!customLogo) {
      dispatchSplashDone();
      setReady(true);
    }
  }, [loaded, customLogo]);

  if (ready) {
    return <>{children}</>;
  }

  if (customLogo) {
    return <SplashScreen onComplete={onComplete} />;
  }

  if (!loaded) {
    return <BootShell />;
  }

  return <>{children}</>;
}
