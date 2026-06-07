import Avatar from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';
import { logout } from '@/routes';
import { create as projectsCreate, index as projectsIndex, show as projectShow } from '@/routes/projects';
import { type SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { router, usePage } from '@inertiajs/react';
import { Check, ChevronDown, FolderKanban, LogOut, Plus } from 'lucide-react';

export default function ProjectSwitcher({ currentProjectId }: { currentProjectId?: number }) {
    const { recentProjects, auth, sidebarCollapsed } = usePage<SharedProps>().props;
    const user = auth.user;
    const current = recentProjects.find((project) => project.id === currentProjectId);

    if (!user) {
        return null;
    }

    const projectLabel = current?.name ?? 'Select project';
    const tooltipLabel = `${user.name} — ${projectLabel}`;

    return (
        <div
            className={cn(
                'relative shrink-0 border-b border-border dark:border-border-dark',
                sidebarCollapsed ? 'px-2.5 py-2' : 'px-3 py-3',
            )}
        >
            <DropdownMenu className="w-full">
                <SidebarTooltip enabled={sidebarCollapsed} label={tooltipLabel} className="w-full">
                    <DropdownMenuTrigger
                        aria-label={`Switch project — ${projectLabel}`}
                        className={cn(
                            'w-full min-w-0 hover:bg-slate-100 dark:hover:bg-neutral-800',
                            sidebarCollapsed
                                ? 'justify-center py-1.5'
                                : 'justify-between gap-1 py-0.5',
                        )}
                    >
                        {sidebarCollapsed ? (
                            <Avatar name={user.name} className="h-8 w-8" />
                        ) : (
                            <>
                                <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
                                    <Avatar name={user.name} className="h-8 w-8 shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {user.name}
                                        </span>
                                        <span className="block truncate text-xs text-slate-500 dark:text-neutral-400">
                                            {projectLabel}
                                        </span>
                                    </span>
                                </span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                            </>
                        )}
                    </DropdownMenuTrigger>
                </SidebarTooltip>

                <DropdownMenuContent
                    className="w-64"
                    portaled
                    placement={sidebarCollapsed ? 'right-start' : 'bottom-start'}
                >
                    {recentProjects.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-neutral-400">No projects yet.</div>
                    )}

                    {recentProjects.map((project) => (
                        <DropdownMenuItem
                            key={project.id}
                            onSelect={() => router.visit(projectShow.url(project.id))}
                        >
                            <span className="max-w-56 truncate">{project.name}</span>
                            {project.id === currentProjectId && (
                                <Check className="ml-auto h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden />
                            )}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => router.visit(projectsIndex.url())}>
                        <FolderKanban className="h-4 w-4 text-slate-400" aria-hidden />
                        View all projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.visit(projectsCreate.url())}>
                        <Plus className="h-4 w-4 text-slate-400" aria-hidden />
                        New project
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => router.post(logout.url())}>
                        <LogOut className="h-4 w-4 text-slate-400" aria-hidden />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
