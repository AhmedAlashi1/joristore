export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  const e = window.__deferredInstallPrompt;
  if (!e || typeof (e as BeforeInstallPromptEvent).prompt !== 'function') return null;
  return e as BeforeInstallPromptEvent;
}

export function stashDeferredInstallPrompt(e: Event) {
  window.__deferredInstallPrompt = e;
}
