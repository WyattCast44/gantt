import Card from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type SharedProps } from '@/types';
import { usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage<SharedProps>().props;

    return (
        <AppLayout title="Dashboard">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                        Welcome back{auth.user ? `, ${auth.user.name}` : ''}.
                    </p>
                </div>

                <Card>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                        Browse and create projects from the sidebar, or switch workspaces from the header.
                    </p>
                </Card>
            </div>
        </AppLayout>
    );
}
