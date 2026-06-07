import { cn } from '@/utils/cn';
import { focusRingInputMd } from '@/utils/focusRing';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, rows = 3, ...props }, ref) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            className={cn(
                'block w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500',
                focusRingInputMd,
                className,
            )}
            {...props}
        />
    );
});

export default Textarea;
