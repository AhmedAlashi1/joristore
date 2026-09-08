import { useCallback, useState, type ReactNode } from 'react';
import { SplashScreen } from './SplashScreen';

export function SplashGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const onComplete = useCallback(() => setReady(true), []);

  if (!ready) {
    return <SplashScreen onComplete={onComplete} />;
  }

  return <>{children}</>;
}
