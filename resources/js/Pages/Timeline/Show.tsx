import GanttChart from '@/Pages/Timeline/GanttChart';
import SchedulePreviewDialog from '@/components/schedule-preview-dialog';
import AppLayout from '@/layouts/app-layout';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Project, type Task } from '@/types';
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
            {/* An empty project still renders the chart: the in-chart empty
                state points at quick-create, which works from zero tasks. */}
            <GanttChart projectId={project.id} canEdit={project.can.update} />
            <SchedulePreviewDialog projectId={project.id} />
        </AppLayout>
    );
}
