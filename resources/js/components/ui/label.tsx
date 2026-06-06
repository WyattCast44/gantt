import { type LabelHTMLAttributes } from 'react';

export default function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
    return (
        <label
            className={`block text-xs font-medium text-slate-600 dark:text-neutral-300 ${className}`}
            {...props}
        />
    );
}
