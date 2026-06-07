import { cn } from '@/utils/cn';
import { focusRingInputLg, focusRingInputMd } from '@/utils/focusRing';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: 'md' | 'lg';
}

const sizeClasses = {
    md: cn('rounded-md py-1.5', focusRingInputMd),
    lg: cn('rounded-lg py-2', focusRingInputLg),
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { size = 'md', className, ...props },
    ref,
) {
    return (
        <input
            ref={ref}
            className={cn(
                'block w-full border border-border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-accent-400',
                sizeClasses[size],
                className,
            )}
            {...props}
        />
    );
});

export default Input;
