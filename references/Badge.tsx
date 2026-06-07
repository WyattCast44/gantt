import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'danger' | 'accent';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'ring-slate-300 bg-slate-100 text-slate-600 dark:ring-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    success: 'ring-emerald-300 bg-emerald-100 text-emerald-700 dark:ring-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    danger: 'ring-red-300 bg-red-100 text-red-700 dark:ring-red-700 dark:bg-red-900/30 dark:text-red-400',
    accent: 'ring-accent-300 bg-accent-100 text-accent-700 dark:ring-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'rounded ring-1 ring-inset px-1.5 py-0.5 text-xs font-medium',
                variantClasses[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
