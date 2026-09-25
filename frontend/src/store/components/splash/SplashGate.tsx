import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isCustomStoreLogo } from '../../lib/store-brand';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { SplashScreen } from './SplashScreen';

export function SplashGate({ children }: { children: ReactNode }) {
  const { logo, loaded } = useStoreBrand();
  const [ready, setReady] = useState(false);
  const onComplete = useCallback(() => {
    setReady(true);
  }, []);

  const customLogo = isCustomStoreLogo(logo);

  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!customLogo) {
      setReady(true);
    }
  }, [loaded, customLogo]);

  if (ready) {
    return <>{children}</>;
  }

  if (!loaded) {
    return <div className="min-h-dvh bg-[var(--bg,#f3f4fb)]" aria-hidden />;
  }

  if (!customLogo) {
    return <>{children}</>;
  }

  return <SplashScreen onComplete={onComplete} />;
}
