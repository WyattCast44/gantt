import { cn } from '@/utils/cn';

interface EmptyStateProps {
    /** Secondary line; primary heading when `title` is set. */
    message: string;
    title?: string;
    /** default: page sections; compact: cards, panels, dashboard tiles */
    density?: 'default' | 'compact';
    action?: React.ReactNode;
    /** Inviting “add something” affordance; omit for filter-no-match or informational empties */
    dashed?: boolean;
}

export default function EmptyState({ message, title, density = 'default', action, dashed }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'rounded-lg bg-white px-4 text-center dark:bg-neutral-900',
                density === 'compact' ? 'py-6' : 'py-8',
                dashed
                    ? 'border border-dashed border-border dark:border-border-dark'
                    : 'border border-border dark:border-border-dark',
            )}
        >
            {title && (
                <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
            )}
            <p
                className={cn(
                    'text-sm text-slate-500 dark:text-neutral-400',
                    title && 'mt-1.5',
                )}
            >
                {message}
            </p>
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}
