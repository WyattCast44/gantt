import { cn } from '@/utils/cn';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
}

export default function Label({ required, children, className, ...props }: LabelProps) {
    return (
        <label
            className={cn('mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300', className)}
            {...props}
        >
            {children}
            {required && <span className="text-red-500"> *</span>}
        </label>
    );
}
