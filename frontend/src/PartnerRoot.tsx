import { useEffect } from 'react';
import './index.css';
import { I18nProvider } from './providers/i18n-provider';
import PartnerApp from './partner/PartnerApp';

export function PartnerRoot() {
  useEffect(() => {
    document.getElementById('pre-splash')?.remove();
    document.documentElement.dataset.app = 'partner';
  }, []);

  return (
    <div className="partner-app min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <I18nProvider>
        <PartnerApp />
      </I18nProvider>
    </div>
  );
}
