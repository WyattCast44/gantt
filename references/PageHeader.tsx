import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    backLink?: { href: string; label: string };
    breadcrumb?: ReactNode;
    /** Rendered on the same row as the breadcrumb, after it (e.g. toolbar controls). */
    breadcrumbAside?: ReactNode;
    /** Keep an accessible page title without showing a large heading (e.g. toolbar-only layouts). */
    visuallyHideTitle?: boolean;
    /** Extra classes on the breadcrumb toolbar row (e.g. full-bleed bar above a split pane). */
    breadcrumbBarClassName?: string;
}

export default function PageHeader({
    title,
    subtitle,
    actions,
    backLink,
    breadcrumb,
    breadcrumbAside,
    visuallyHideTitle = false,
    breadcrumbBarClassName,
}: PageHeaderProps) {
    const showVisibleTitleBlock = !visuallyHideTitle || Boolean(subtitle) || Boolean(actions);

    return (
        <div>
            {visuallyHideTitle && <h1 className="sr-only">{title}</h1>}
            {breadcrumb && (
                <div
                    className={cn(
                        'flex min-w-0 flex-wrap items-center gap-3',
                        breadcrumbAside ? 'justify-between' : '',
                        !breadcrumbBarClassName && (backLink ? 'mb-2' : 'mb-3'),
                        breadcrumbBarClassName,
                    )}
                >
                    <div className="min-w-0 flex-1">{breadcrumb}</div>
                    {breadcrumbAside && (
                        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">{breadcrumbAside}</div>
                    )}
                </div>
            )}
            {backLink && (
                <div className="flex items-center gap-2">
                    <Link
                        href={backLink.href}
                        className={cn(
                            'inline-flex rounded-md text-sm text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-300',
                            focusRingNeutral,
                        )}
                    >
                        &larr; {backLink.label}
                    </Link>
                </div>
            )}
            {showVisibleTitleBlock && (
                <div className={cn('flex items-start justify-between', backLink && 'mt-2')}>
                    <div>
                        {!visuallyHideTitle && (
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
                        )}
                        {subtitle && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{subtitle}</p>
                        )}
                    </div>
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            )}
        </div>
    );
}
