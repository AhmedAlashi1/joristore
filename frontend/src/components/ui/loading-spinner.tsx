import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ className, label, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={cn('inline-flex flex-col items-center justify-center gap-3', className)} role="status" aria-live="polite">
      <div className="relative">
        <div className={cn('absolute inset-0 animate-ping rounded-full bg-[#7367f0]/20', sizeMap[size])} />
        <Loader2 className={cn('relative animate-spin text-[#7367f0]', sizeMap[size])} />
      </div>
      {label ? <span className="text-xs text-[#8a8da8] dark:text-[#a2a5be]">{label}</span> : null}
    </div>
  );
}
