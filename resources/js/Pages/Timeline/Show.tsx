import GanttChart from '@/Pages/Timeline/GanttChart';
import { ButtonLink } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { create as tasksCreate } from '@/routes/projects/tasks';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Project, type Task } from '@/types';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

type TimelineProps = {
    project: Project;
    tasks: Task[];
};

/**
 * Gantt timeline page. Syncs the Inertia task tree into the deterministic
 * viewport store (re-init on project switch; refresh tasks in place otherwise),
 * then hands off rendering to the virtualized GanttChart.
 */
export default function Show({ project, tasks }: TimelineProps) {
    const init = useGanttStore((state) => state.init);
    const setTasks = useGanttStore((state) => state.setTasks);

    // Reset the viewport (expansion/scroll) when the project changes. Task
    // refreshes are handled by the effect below so expansion survives edits.
    useEffect(() => {
        init({ tasks, projectStart: project.start_date, projectEnd: project.end_date });
    }, [project.id]);

    // Refresh tasks in place (e.g. after a drag edit) without losing expansion.
    useEffect(() => {
        setTasks(tasks);
    }, [tasks]);

    return (
        <AppLayout title={`${project.name} — Timeline`} project={project} fullBleed>
            {tasks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                    <p className="max-w-sm text-sm text-slate-500 dark:text-neutral-400">
                        No tasks yet. Add tasks to see them laid out on the timeline.
                    </p>
                    {project.can.update && (
                        <ButtonLink href={tasksCreate.url(project.id)}>
                            <Plus className="mr-2 h-4 w-4" aria-hidden />
                            New task
                        </ButtonLink>
                    )}
                </div>
            ) : (
                <GanttChart projectId={project.id} canEdit={project.can.update} />
            )}
        </AppLayout>
    );
}
