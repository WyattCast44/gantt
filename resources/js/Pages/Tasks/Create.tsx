import PageHeader from '@/components/ui/page-header';
import TaskForm from '@/Pages/Tasks/Partials/TaskForm';
import AppLayout from '@/layouts/app-layout';
import { index as tasksIndex } from '@/routes/projects/tasks';
import { type BaseClassificationValue, type Project, type Task } from '@/types';
import { allowedClassifications } from '@/utils/classification';
import { useMemo } from 'react';

export default function Create({
    project,
    parents,
    defaultParentId,
}: {
    project: Project;
    parents: Task[];
    defaultParentId: number | null;
}) {
    const options = useMemo(
        () => allowedClassifications(project.base_classification.value as BaseClassificationValue),
        [project.base_classification.value],
    );

    return (
        <AppLayout title="New task" project={project}>
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <PageHeader title="New task" description="Add a task to the work breakdown — nest it under a parent or leave it top-level." />

                <TaskForm
                    project={project}
                    parents={parents}
                    defaultParentId={defaultParentId}
                    options={options}
                    cancelHref={tasksIndex.url(project.id)}
                />
            </div>
        </AppLayout>
    );
}
