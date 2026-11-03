export type InstallPlatform = 'ios' | 'android' | 'desktop';

export function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function detectInstallPlatform(): InstallPlatform {
  if (isIosDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  return 'desktop';
}

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
