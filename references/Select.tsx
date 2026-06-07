import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { focusRingInputLg, focusRingInputMd } from '@/utils/focusRing';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    size?: 'md' | 'lg';
}

/**
 * Native `<select>` arrows sit flush to the border; we use `appearance-none` and a
 * background chevron inset with `right 0.75rem` so spacing matches text padding.
 * Full `bg-[url(...)]` strings must stay literal for Tailwind to emit utilities.
 */
const selectChevronClasses =
    'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22/%3E%3C/svg%3E")] dark:bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23a3a3a3%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22/%3E%3C/svg%3E")]';

const sizeClasses = {
    md: cn('rounded-md py-1.5 shadow-sm', focusRingInputMd),
    lg: cn('rounded-lg py-2 shadow-sm', focusRingInputLg),
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ size = 'md', className, children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(
                    'block w-full appearance-none border border-border bg-white bg-[length:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat pl-3 pr-10 text-sm text-slate-900 dark:border-border-dark dark:bg-neutral-800 dark:text-white dark:focus:border-accent-400',
                    selectChevronClasses,
                    sizeClasses[size],
                    className,
                )}
                {...props}
            >
                {children}
            </select>
        );
    },
);

Select.displayName = 'Select';

export default Select;
