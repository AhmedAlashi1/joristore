import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function CheckoutSection({
  icon,
  title,
  hint,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('checkout-section glass-strong overflow-hidden rounded-xl shadow-[0_2px_16px_rgba(15,23,42,0.05)]', className)}>
      <div className="flex items-center gap-2.5 border-b border-black/[0.04] px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] [&_svg]:size-4">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold text-[var(--fg)]">{title}</h2>
          {hint ? <p className="mt-0.5 text-[10px] leading-snug text-store-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="space-y-2.5 p-3">{children}</div>
    </section>
  );
}
