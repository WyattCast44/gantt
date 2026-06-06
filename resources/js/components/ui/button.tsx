import { cn } from '@/utils/cn';
import { focusRingNeutral, focusRingPrimary } from '@/utils/focusRing';
import { type ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
};

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: cn(
        'bg-accent-600 text-white shadow-sm hover:bg-accent-500 disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-400',
        focusRingPrimary,
    ),
    secondary: cn(
        'border border-border bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-border-dark dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
        focusRingNeutral,
    ),
};

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                'inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed',
                variants[variant],
                className,
            )}
            {...props}
        />
    );
}
