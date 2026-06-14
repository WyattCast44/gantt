import GanttChart from '@/Pages/Timeline/GanttChart';
import SchedulePreviewDialog from '@/components/schedule-preview-dialog';
import AppLayout from '@/layouts/app-layout';
import { timeline as projectTimeline } from '@/routes/projects';
import { timeline as taskTimeline } from '@/routes/projects/tasks';
import { useGanttStore } from '@/stores/useGanttStore';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { type Project, type Task } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

type ScopeTask = {
    id: number;
    name: string;
};

type TimelineProps = {
    project: Project;
    tasks: Task[];
    /** When present, the timeline is scoped to this task's subtree. */
    scopeTask?: ScopeTask;
    /** The scoped task's ancestor chain (root → … → parent), for the breadcrumb. */
    ancestors?: ScopeTask[];
};

/**
 * Gantt timeline page. Syncs the Inertia task tree into the deterministic
 * viewport store (re-init on project switch; refresh tasks in place otherwise),
 * then hands off rendering to the virtualized GanttChart. When `scopeTask` is
 * set the same machinery runs against a single task's subtree, with a breadcrumb
 * band giving ancestor context and a way back to the full project timeline.
 */
export default function Show({ project, tasks, scopeTask, ancestors = [] }: TimelineProps) {
    const init = useGanttStore((state) => state.init);
    const setTasks = useGanttStore((state) => state.setTasks);

    // Reset the viewport (expansion/scroll) when the project or scope changes.
    // Task refreshes are handled by the effect below so expansion survives edits.
    // A scoped subtree auto-scales to frame the whole tree (fit) and tracks just
    // its own dates, rather than the full project window.
    useEffect(() => {
        if (scopeTask) {
            init({ tasks, projectStart: null, projectEnd: null, fit: true });
        } else {
            init({ tasks, projectStart: project.start_date, projectEnd: project.end_date });
        }
    }, [project.id, scopeTask?.id]);

    // Refresh tasks in place (e.g. after a drag edit) without losing expansion.
    useEffect(() => {
        setTasks(tasks);
    }, [tasks]);

    const title = scopeTask ? `${scopeTask.name} — Timeline` : `${project.name} — Timeline`;

    return (
        <AppLayout title={title} project={project} fullBleed>
            {scopeTask ? (
                <div className="flex h-full flex-col">
                    <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-2.5 text-sm dark:border-border-dark">
                        <Link
                            href={projectTimeline.url(project.id)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-sm text-slate-500 hover:text-accent-600 dark:text-neutral-400 dark:hover:text-accent-400',
                                focusRingNeutral,
                            )}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Full timeline
                        </Link>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <Link
                            href={projectTimeline.url(project.id)}
                            className={cn('truncate rounded-sm text-slate-500 hover:text-accent-600 dark:text-neutral-400 dark:hover:text-accent-400', focusRingNeutral)}
                        >
                            {project.name}
                        </Link>
                        {ancestors.map((ancestor) => (
                            <span key={ancestor.id} className="flex min-w-0 items-center gap-2">
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-neutral-600" aria-hidden />
                                <Link
                                    href={taskTimeline.url([project.id, ancestor.id])}
                                    className={cn(
                                        'truncate rounded-sm text-slate-500 hover:text-accent-600 dark:text-neutral-400 dark:hover:text-accent-400',
                                        focusRingNeutral,
                                    )}
                                >
                                    {ancestor.name}
                                </Link>
                            </span>
                        ))}
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <span className="truncate font-medium text-slate-800 dark:text-neutral-100" aria-current="page">
                            {scopeTask.name}
                        </span>
                    </div>
                    <div className="min-h-0 flex-1">
                        <GanttChart projectId={project.id} canEdit={project.can.update} />
                    </div>
                </div>
            ) : (
                /* An empty project still renders the chart: the in-chart empty
                   state points at quick-create, which works from zero tasks. */
                <GanttChart projectId={project.id} canEdit={project.can.update} />
            )}
            <SchedulePreviewDialog projectId={project.id} />
        </AppLayout>
    );
}
