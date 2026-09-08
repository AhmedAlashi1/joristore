import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm',
  {
    variants: {
      variant: {
        default: 'bg-[#7367f0]/15 text-[#7367f0] border border-[#7367f0]/25 dark:bg-[#7367f0]/20 dark:text-[#a89cf8]',
        success: 'bg-[#28c76f]/15 text-[#28c76f] border border-[#28c76f]/25 dark:bg-[#28c76f]/20 dark:text-[#63f29f]',
        warning: 'bg-[#ff9f43]/15 text-[#ff9f43] border border-[#ff9f43]/25 dark:bg-[#ff9f43]/20 dark:text-[#ffbf7b]',
        destructive: 'bg-[#ea5455]/15 text-[#ea5455] border border-[#ea5455]/25 dark:bg-[#ea5455]/20 dark:text-[#ff8f8f]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
