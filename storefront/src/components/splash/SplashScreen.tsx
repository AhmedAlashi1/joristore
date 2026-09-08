import { useEffect, useState } from 'react';
import { SPLASH_DONE_EVENT } from '../../providers/install-provider';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn } from '../../lib/utils';

const SPLASH_MS = 3000;

type SplashScreenProps = {
  onComplete: () => void;
};

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { name, description, logo } = useStoreBrand();
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const boot = document.getElementById('boot-splash');
    if (boot) boot.remove();

    const holdTimer = window.setTimeout(() => setPhase('hold'), 500);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2400);
    const doneTimer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(SPLASH_DONE_EVENT));
      onComplete();
    }, SPLASH_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={cn(
        'splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden',
        phase === 'exit' && 'splash-exit',
      )}
    >
      <div className="splash-bg" aria-hidden />
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      <div className={cn('splash-rings', phase !== 'enter' && 'splash-rings-expand')}>
        <span className="splash-ring splash-ring-1" />
        <span className="splash-ring splash-ring-2" />
        <span className="splash-ring splash-ring-3" />
      </div>

      <div className={cn('splash-logo-wrap', phase === 'enter' && 'splash-logo-enter')}>
        <div className="splash-logo-glow" />
        <img src={logo} alt={name} className="splash-logo" width={120} height={120} />
        <div className="splash-shimmer" />
      </div>

      <div className={cn('splash-text-wrap', phase !== 'enter' && 'splash-text-visible')}>
        <h1 className="splash-title">{name}</h1>
        {description ? <p className="splash-subtitle">{description}</p> : null}
      </div>

      <div className={cn('splash-loader', phase === 'hold' && 'splash-loader-active')}>
        <span /><span /><span />
      </div>
    </div>
  );
}
