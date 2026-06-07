import { cn } from '@/utils/cn';

const activeNavLinkClasses =
    'border border-accent-200 border-l-2 border-l-accent-600 bg-accent-50 font-semibold text-accent-900 dark:border-transparent dark:border-l-accent-400 dark:bg-accent-500/10 dark:text-accent-300';

const activeNavLinkCollapsedClasses =
    'border border-accent-200 bg-accent-50 font-semibold text-accent-900 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300';

const inactiveNavLinkClasses =
    'border border-transparent border-l-2 border-l-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-transparent dark:border-l-transparent dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';

const inactiveNavLinkCollapsedClasses =
    'border border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-transparent dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';

/** Primary app sidebar (Dashboard, Projects, project workspace). */
export function sidebarNavLinkClasses(active: boolean, collapsed: boolean, disabled = false): string {
    if (disabled) {
        return collapsed
            ? 'cursor-not-allowed text-slate-400 dark:text-neutral-600'
            : cn(inactiveNavLinkClasses, 'cursor-not-allowed hover:bg-transparent hover:text-slate-400 dark:hover:bg-transparent dark:hover:text-neutral-600');
    }

    if (collapsed) {
        return active ? activeNavLinkCollapsedClasses : inactiveNavLinkCollapsedClasses;
    }

    return active ? activeNavLinkClasses : inactiveNavLinkClasses;
}

/** In-page section tabs (e.g. project settings). */
export function sectionNavLinkClasses(active: boolean): string {
    return cn('transition-colors', active ? activeNavLinkClasses : inactiveNavLinkClasses);
}
