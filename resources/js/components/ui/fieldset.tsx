import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';

type FieldsetProps = {
    title?: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
};

/**
 * A titled settings section: optional heading + description, a bordered grid of
 * FieldRows, and an optional right-aligned action footer below the card.
 */
export default function Fieldset({ title, description, children, footer, className }: FieldsetProps) {
    const hasHeader = Boolean(title || description);

    return (
        <section className={className}>
            {title && <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">{description}</p>}

            <div
                className={cn(
                    'divide-y divide-border overflow-hidden rounded-lg border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-neutral-800',
                    hasHeader && 'mt-3',
                )}
            >
                {children}
            </div>

            {footer && <div className="mt-3 flex justify-end gap-2">{footer}</div>}
        </section>
    );
}

type FieldRowProps = {
    label: string;
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
};

/**
 * A single labelled row in a Fieldset: label cell on the left, control cell on
 * the right, divided by a vertical rule on larger screens.
 */
export function FieldRow({ label, htmlFor, required = false, children, className }: FieldRowProps) {
    return (
        <div className={cn('grid grid-cols-1 sm:grid-cols-[200px_1fr]', className)}>
            <label
                htmlFor={htmlFor}
                className="flex items-start gap-0.5 px-4 py-3 text-xs font-medium text-slate-600 dark:text-neutral-300"
            >
                <span>{label}</span>
                {required && <span className="text-red-500">*</span>}
            </label>
            <div className="px-4 py-3">{children}</div>
        </div>
    );
}
