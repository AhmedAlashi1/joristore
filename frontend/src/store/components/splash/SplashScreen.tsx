import { useEffect, useState } from 'react';
import { prefetchStoreHome } from '../../lib/prefetch-home';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn } from '../../lib/utils';

const SPLASH_MS = 2600;
const IMPACT_AT_MS = 480;

type SplashScreenProps = {
  onComplete: () => void;
};

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { name, description, logo } = useStoreBrand();
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const showLogo = true;
  const [impacted, setImpacted] = useState(false);
  const [logoSettled, setLogoSettled] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.getElementById('boot-splash')?.remove();
    });
    void prefetchStoreHome();
  }, []);

  useEffect(() => {
    if (!logo) return undefined;
    const img = new Image();
    img.src = logo;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = logo;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [logo]);

  useEffect(() => {
    if (!showLogo) return undefined;

    const impactTimer = window.setTimeout(() => setImpacted(true), IMPACT_AT_MS);
    const settledTimer = window.setTimeout(() => setLogoSettled(true), 1200);
    const holdTimer = window.setTimeout(() => setPhase('hold'), 1300);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2800);
    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, SPLASH_MS);

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(settledTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete, showLogo]);

  if (!showLogo) {
    return null;
  }

  return (
    <div
      className={cn(
        'splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden',
        phase === 'exit' && 'splash-exit',
      )}
      style={{ background: 'var(--bg, #f3f4fb)' }}
    >
      <div
        className={cn(
          'splash-backdrop',
          phase === 'exit' && 'splash-backdrop-out',
          impacted && phase === 'enter' && 'splash-screen-shake',
        )}
        aria-hidden
      >
        <div className="splash-bg" />
        <div className="splash-orb splash-orb-1" />
        <div className="splash-orb splash-orb-2" />
        <div className="splash-orb splash-orb-3" />
      </div>

      <div className={cn('splash-impact-flash', impacted && 'splash-impact-flash-on')} aria-hidden />

      <div className={cn('splash-rings', impacted && 'splash-rings-impact')}>
        <span className="splash-ring splash-ring-1" />
        <span className="splash-ring splash-ring-2" />
        <span className="splash-ring splash-ring-3" />
      </div>

      <div className={cn('splash-dust', impacted && 'splash-dust-active')} aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`splash-dust-bit splash-dust-bit-${i + 1}`} />
        ))}
      </div>

      <div className={cn('splash-smoke', impacted && 'splash-smoke-active')} aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`splash-smoke-puff splash-smoke-puff-${i + 1}`} />
        ))}
      </div>

      <div
        className={cn(
          'splash-logo-wrap',
          phase === 'enter' && !logoSettled && 'splash-logo-slam',
          logoSettled && 'splash-logo-settled',
        )}
      >
        <div className="splash-logo-glow" />
        <img src={logo} alt={name} className="splash-logo" width={120} height={120} />
        <div className="splash-shimmer" />
      </div>

      <div className={cn('splash-text-wrap', impacted && 'splash-text-visible', phase === 'exit' && 'splash-text-out')}>
        <h1 className="splash-title">{name}</h1>
        {description ? <p className="splash-subtitle">{description}</p> : null}
      </div>

      <div className={cn('splash-loader', phase === 'hold' && 'splash-loader-active', phase === 'exit' && 'splash-text-out')}>
        <span /><span /><span />
      </div>
    </div>
  );
}
