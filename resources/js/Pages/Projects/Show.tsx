import Card from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type Project } from '@/types';

export default function Show({ project }: { project: Project }) {
    return (
        <AppLayout title={project.name} project={project}>
            <div className="flex flex-col gap-6">
                <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>

                <Card>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Project workspace coming soon.</p>
                </Card>
            </div>
        </AppLayout>
    );
}
