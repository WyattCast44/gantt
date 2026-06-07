import { cn } from '@/utils/cn';
import { focusRingNeutral, focusRingPrimary } from '@/utils/focusRing';
import { Link } from '@inertiajs/react';
import { type ButtonHTMLAttributes, type ComponentPropsWithoutRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'size'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
    primary: cn(
        'bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-400',
        focusRingPrimary,
    ),
    secondary: cn(
        'border border-border bg-white text-slate-700 hover:bg-slate-50 dark:border-border-dark dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
        focusRingNeutral,
    ),
    danger: cn(
        'bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500',
        focusRingPrimary,
    ),
    ghost: cn(
        'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        focusRingNeutral,
    ),
};

const sizes: Record<ButtonSize, string> = {
    default: 'px-4 py-2',
    sm: 'px-3 py-1.5',
    icon: 'p-2',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'default', className?: string): string {
    return cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md text-sm font-medium transition disabled:cursor-not-allowed',
        sizes[size],
        variants[variant],
        className,
    );
}

export function ButtonLink({ variant = 'primary', size = 'default', className = '', ...props }: ButtonLinkProps) {
    return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

export default function Button({
    variant = 'primary',
    size = 'default',
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
