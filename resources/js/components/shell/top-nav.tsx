import Logo from '@/components/shell/logo';
import KeyboardShortcut from '@/components/ui/keyboard-shortcut';
import { dashboard } from '@/routes';
import { type SharedProps } from '@/types';
import { focusRingNeutral } from '@/utils/focusRing';
import { cn } from '@/utils/cn';
import { Link, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';

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
                {/* Global search across all projects (results to be ordered by the
                    active project in a later phase). Placeholder until search lands. */}
                <div className="relative hidden w-56 md:block lg:w-64">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                        type="search"
                        readOnly
                        placeholder="Search…"
                        aria-label="Search across all projects (⌘K or Ctrl+K)"
                        className="block w-full cursor-not-allowed rounded-md border border-border bg-slate-50 py-1.5 pr-14 pl-8 text-sm text-slate-500 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-neutral-400"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <KeyboardShortcut letter="K" />
                    </div>
                </div>
            </div>
        </header>
    );
}
