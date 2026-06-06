import { logout } from '@/routes';
import { type SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type AppLayoutProps = PropsWithChildren<{
    title: string;
}>;

export default function AppLayout({ title, children }: AppLayoutProps) {
    const { auth } = usePage<SharedProps>().props;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
            <Head title={title} />

            <header className="border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                    <span className="text-sm font-semibold tracking-tight">Gantt</span>

                    <div className="flex items-center gap-4 text-sm">
                        {auth.user && (
                            <span className="text-gray-600 dark:text-neutral-400">{auth.user.name}</span>
                        )}
                        <Link
                            href={logout.url()}
                            method="post"
                            as="button"
                            className="text-gray-600 transition hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
                        >
                            Log out
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </div>
    );
}
