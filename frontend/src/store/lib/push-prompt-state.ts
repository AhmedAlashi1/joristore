export const PUSH_PROMPT_AFTER_AUTH_KEY = 'jori-push-prompt-after-auth';

export function markPushPromptAfterAuth(): void {
  try {
    sessionStorage.setItem(PUSH_PROMPT_AFTER_AUTH_KEY, '1');
    sessionStorage.removeItem('jori-push-modal-dismiss-session');
  } catch {
    /* ignore */
  }
}

export function consumePushPromptAfterAuth(): boolean {
  try {
    if (sessionStorage.getItem(PUSH_PROMPT_AFTER_AUTH_KEY) !== '1') return false;
    sessionStorage.removeItem(PUSH_PROMPT_AFTER_AUTH_KEY);
    return true;
  } catch {
    return false;
  }
}

export function shouldShowPushPromptThisSession(): boolean {
  try {
    return sessionStorage.getItem(PUSH_PROMPT_AFTER_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}
