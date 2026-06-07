import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import {
    focusRingDanger,
    focusRingNeutral,
    focusRingPrimary,
    focusRingSuccess,
} from '@/utils/focusRing';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonBaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

type AsButton = ButtonBaseProps &
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        as?: 'button';
        href?: never;
    };

type AsAnchor = ButtonBaseProps &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        as: 'a';
        href: string;
    };

type AsComponent = ButtonBaseProps & {
    as: React.ComponentType<any>;
    [key: string]: any;
};

type ButtonProps = AsButton | AsAnchor | AsComponent;

const variantClasses: Record<ButtonVariant, string> = {
    primary: cn(
        'bg-accent-600 text-white shadow-sm hover:bg-accent-500 disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-400',
        focusRingPrimary,
    ),
    secondary: cn(
        'border border-border bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-border-dark dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
        focusRingNeutral,
    ),
    danger: cn('bg-red-600 text-white hover:bg-red-500 disabled:opacity-50', focusRingDanger),
    success: cn(
        'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50',
        focusRingSuccess,
    ),
    ghost: cn(
        'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white',
        focusRingNeutral,
    ),
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'rounded px-3 py-1 text-sm',
    md: 'rounded-md px-4 py-2 text-sm',
};

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    (props, ref) => {
        const {
            as: Component = 'button',
            variant = 'primary',
            size = 'md',
            fullWidth,
            className,
            ...rest
        } = props;

        const classes = cn(
            'inline-flex items-center justify-center font-medium',
            sizeClasses[size as ButtonSize],
            variantClasses[variant as ButtonVariant],
            fullWidth && 'w-full',
            className,
        );

        if (Component === 'button') {
            return (
                <button
                    ref={ref as React.Ref<HTMLButtonElement>}
                    className={classes}
                    {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                />
            );
        }

        if (Component === 'a') {
            return (
                <a
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    className={classes}
                    {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                />
            );
        }

        return <Component ref={ref} className={classes} {...rest} />;
    },
);

Button.displayName = 'Button';

export default Button;
