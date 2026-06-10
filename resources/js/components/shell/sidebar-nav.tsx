import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';
import { dashboard } from '@/routes';
import {
    create as projectsCreate,
    index as projectsIndex,
    settings as projectSettings,
    show as projectShow,
    timeline as projectTimeline,
} from '@/routes/projects';
import { index as documentsIndex } from '@/routes/projects/documents';
import { index as tasksIndex } from '@/routes/projects/tasks';
import { type Project, type SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { sidebarNavLinkClasses } from '@/utils/navLink';
import { Link, usePage } from '@inertiajs/react';
import {
    FileText,
    FolderKanban,
    GanttChartSquare,
    LayoutGrid,
    ListTree,
    type LucideIcon,
    Settings,
} from 'lucide-react';

type NavLink = {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    active?: boolean;
    disabled?: boolean;
};

function globalItems(current: string): NavLink[] {
    const insideProject = /^\/projects\/\d/.test(current);

    return [
        {
            key: 'dashboard',
            label: 'Dashboard',
            icon: LayoutGrid,
            href: dashboard.url(),
            active: current === dashboard.url(),
        },
        {
            key: 'projects',
            label: 'Projects',
            icon: FolderKanban,
            href: projectsIndex.url(),
            active: !insideProject && (current === projectsIndex.url() || current.startsWith(projectsCreate.url())),
        },
    ];
}

function projectItems(project: Project, current: string): NavLink[] {
    const overviewUrl = projectShow.url(project.id);
    const timelineUrl = projectTimeline.url(project.id);
    const tasksUrl = tasksIndex.url(project.id);
    const documentsUrl = documentsIndex.url(project.id);
    const settingsUrl = projectSettings.url(project.id);
    const onSettings = current.startsWith(settingsUrl);

    const items: NavLink[] = [
        { key: 'overview', label: 'Overview', icon: LayoutGrid, href: overviewUrl, active: current === overviewUrl },
        { key: 'timeline', label: 'Timeline', icon: GanttChartSquare, href: timelineUrl, active: current.startsWith(timelineUrl) },
        { key: 'tasks', label: 'Tasks', icon: ListTree, href: tasksUrl, active: current.startsWith(tasksUrl) },
        { key: 'documents', label: 'Documents', icon: FileText, href: documentsUrl, active: current.startsWith(documentsUrl) },
    ];

    if (project.can.updateSettings) {
        items.push({
            key: 'settings',
            label: 'Settings',
            icon: Settings,
            href: settingsUrl,
            active: onSettings,
        });
    }

    return items;
}

function NavRow({ item, collapsed }: { item: NavLink; collapsed: boolean }) {
    const { icon: Icon, label, href, active, disabled } = item;

    const base = cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm', collapsed && 'justify-center px-0');

    const content = (
        <>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && disabled && (
                <span className="ml-auto text-[10px] font-medium tracking-wide text-slate-400 uppercase dark:text-neutral-600">
                    soon
                </span>
            )}
        </>
    );

    if (disabled || !href) {
        return (
            <SidebarTooltip enabled={collapsed} label={`${label} — coming soon`} className="w-full">
                <div className={cn(base, sidebarNavLinkClasses(false, collapsed, true))} aria-disabled>
                    {content}
                </div>
            </SidebarTooltip>
        );
    }

    return (
        <SidebarTooltip enabled={collapsed} label={label} className="w-full">
            <Link
                href={href}
                className={cn(base, focusRingNeutral, sidebarNavLinkClasses(active ?? false, collapsed))}
            >
                {content}
            </Link>
        </SidebarTooltip>
    );
}

export default function SidebarNav({ project }: { project?: Project }) {
    const page = usePage<SharedProps>();
    const collapsed = page.props.sidebarCollapsed;
    const current = page.url;

    const items = project ? projectItems(project, current) : globalItems(current);

    return (
        <nav className="flex flex-col gap-1 p-3">
            {items.map((item) => (
                <NavRow key={item.key} item={item} collapsed={collapsed} />
            ))}
        </nav>
    );
}
