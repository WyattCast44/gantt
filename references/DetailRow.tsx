import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DetailRowProps {
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    showIcon?: boolean;
    /** Cap the value column at 60% of the row width. */
    constrainValueWidth?: boolean;
}

export default function DetailRow({
    label,
    value,
    icon: Icon,
    showIcon = false,
    constrainValueWidth = false,
}: DetailRowProps) {
    return (
        <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="shrink-0 text-sm text-slate-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                    {showIcon && Icon ? (
                        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                    ) : null}
                    <span>{label}</span>
                </span>
            </dt>
            <dd
                className={cn(
                    'min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white',
                    constrainValueWidth && 'max-w-[60%]',
                )}
            >
                {value}
            </dd>
        </div>
    );
}
