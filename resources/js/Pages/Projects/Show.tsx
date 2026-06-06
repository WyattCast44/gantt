import Card from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

type ProjectShowProps = {
    project: {
        id: number;
        name: string;
    };
};

export default function Show({ project }: ProjectShowProps) {
    return (
        <AppLayout title={project.name}>
            <div className="flex flex-col gap-6">
                <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>

                <Card>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                        Project workspace coming soon.
                    </p>
                </Card>
            </div>
        </AppLayout>
    );
}
