import { cn } from '@/utils/cn';
import { focusRingInputMd } from '@/utils/focusRing';
import { forwardRef, type SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
    return (
        <select
            ref={ref}
            className={cn(
                'block w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-border-dark dark:bg-neutral-800 dark:text-white',
                focusRingInputMd,
                className,
            )}
            {...props}
        />
    );
});

export default Select;
