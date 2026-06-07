import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
};

export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
            <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
                {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
