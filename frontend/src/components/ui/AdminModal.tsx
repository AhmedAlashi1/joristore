import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function AdminModal({ open, onClose, title, children, footer, wide }: AdminModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop-enter fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-panel-enter glass-strong flex max-h-[min(92vh,900px)] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl sm:shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <div className="shrink-0 border-b border-white/15 px-5 py-4 dark:border-white/8">
          <h3 id="admin-modal-title" className="text-lg font-bold">
            {title}
          </h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-white/15 px-5 py-4 dark:border-white/8">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
