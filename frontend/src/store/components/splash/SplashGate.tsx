import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { dispatchSplashDone } from '../../lib/splash-done';
import { SplashScreen } from './SplashScreen';

export function SplashGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const onComplete = useCallback(() => {
    dispatchSplashDone();
    setReady(true);
  }, []);

  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
  }, []);

  if (ready) {
    return <>{children}</>;
  }

  return <SplashScreen onComplete={onComplete} />;
}
