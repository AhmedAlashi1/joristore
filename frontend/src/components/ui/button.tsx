import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'btn-glow bg-gradient-to-r from-[#7367f0] to-[#8b7ff5] text-white shadow-[0_4px_16px_rgba(115,103,240,0.3)] hover:from-[#685dd8] hover:to-[#7367f0]',
        secondary: 'glass text-[#4b4f62] hover:bg-white/70 dark:text-[#d7d8ea] dark:hover:bg-white/10',
        destructive: 'bg-gradient-to-r from-[#ea5455] to-[#f06b6c] text-white shadow-[0_4px_16px_rgba(234,84,85,0.3)] hover:from-[#d44f50] hover:to-[#ea5455]',
        ghost: 'text-[#6f6b7d] hover:bg-white/50 dark:text-[#b6b8cc] dark:hover:bg-white/8',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
