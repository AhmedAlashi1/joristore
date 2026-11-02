import { useEffect, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { SmartSearchOverlay } from '../search/SmartSearchOverlay';
import { AiAssistIcon } from '../search/AiAssistIcon';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { useLocale } from '../../providers/locale-provider';
import { socialAriaLabels } from '../social/SocialBrandIcon';
import { WhatsAppFabIcon } from '../social/WhatsAppFabIcon';
import { normalizeWhatsAppUrl } from '../../lib/whatsapp';

const stackPosition: CSSProperties = {
  right: 'max(12px, calc(50% - 240px + 12px))',
  bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 10px)',
};

export function FloatingAssistStack() {
  const { social } = useStoreBrand();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const whatsappRaw = social?.whatsapp?.trim();

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <div
        className="floating-assist-stack fixed z-[46] flex flex-col items-center gap-3"
        style={stackPosition}
      >
        <button
          type="button"
          className="ai-fab-btn"
          onClick={() => setSearchOpen(true)}
          aria-label={t.smartSearch}
          title={t.smartSearch}
        >
          <span className="assist-fab-motion assist-fab-motion-ai" aria-hidden>
            <AiAssistIcon size={40} className="ai-fab-icon" />
          </span>
        </button>

        {whatsappRaw ? (
          <a
            href={normalizeWhatsAppUrl(whatsappRaw)}
            target="_blank"
            rel="noopener noreferrer"
            className="assist-fab-btn assist-fab-whatsapp"
            aria-label={socialAriaLabels.whatsapp[ar ? 'ar' : 'en']}
            title={socialAriaLabels.whatsapp[ar ? 'ar' : 'en']}
          >
            <span className="assist-fab-motion assist-fab-motion-wa" aria-hidden>
              <WhatsAppFabIcon size={40} className="assist-fab-wa-icon" />
            </span>
          </a>
        ) : null}
      </div>

      <SmartSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
