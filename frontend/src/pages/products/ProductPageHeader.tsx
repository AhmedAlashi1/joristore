import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type ProductPageHeaderProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function ProductPageHeader({
  title,
  subtitle,
  backTo = '/admin/products',
  backLabel,
  actions,
}: ProductPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#7367f0] hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {backLabel ?? 'المنتجات'}
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm text-[#8a8da8]">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
