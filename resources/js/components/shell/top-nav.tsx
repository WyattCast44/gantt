import GlobalSearch from '@/components/shell/global-search';
import Logo from '@/components/shell/logo';
import { dashboard } from '@/routes';
import { type SharedProps } from '@/types';
import { focusRingNeutral } from '@/utils/focusRing';
import { cn } from '@/utils/cn';
import { Link, usePage } from '@inertiajs/react';

export default function TopNav() {
    const { sidebarCollapsed } = usePage<SharedProps>().props;

    return (
        <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4 dark:border-border-dark dark:bg-neutral-900">
            <Link
                href={dashboard.url()}
                aria-label="Gantt — dashboard"
                className={cn('rounded-md', focusRingNeutral)}
            >
                <Logo collapsed={sidebarCollapsed} />
            </Link>

            <div className="ml-auto flex items-center gap-2">
                {/* Global search: matches across the user's accessible projects,
                    with the active project's hits surfaced first. */}
                <GlobalSearch />
            </div>
        </header>
    );
}
