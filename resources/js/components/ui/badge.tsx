import { cn } from '@/utils/cn';
import { type HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

export default function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                tones[tone],
                className,
            )}
            {...props}
        />
    );
}
