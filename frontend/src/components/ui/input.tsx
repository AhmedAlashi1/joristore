import { cn } from '../../lib/cn';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'glass-input admin-form-input flex h-11 w-full rounded-xl px-3 py-2 text-sm',
        'text-[#2f2b3d] placeholder:text-[#8a8da8]',
        'dark:text-[#e8e9f3] dark:placeholder:text-[#9899b3]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7367f0]/35',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
