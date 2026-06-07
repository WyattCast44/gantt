import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { focusRingInputMd } from '@/utils/focusRing';

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={cn(
                    'block w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm dark:border-border-dark dark:bg-neutral-800 dark:text-white',
                    focusRingInputMd,
                    className,
                )}
                {...props}
            />
        );
    },
);

Textarea.displayName = 'Textarea';

export default Textarea;
