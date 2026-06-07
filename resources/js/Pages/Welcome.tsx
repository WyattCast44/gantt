import Logo from '@/components/shell/logo';
import Button from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';
import { type SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedProps>().props;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 dark:bg-neutral-950">
            <Head title="Welcome" />

            <div className="flex flex-col items-center gap-3 text-center">
                <Logo size="lg" />
                <p className="max-w-md text-sm text-gray-500 dark:text-neutral-400">
                    Gantt is a project management tool that allows you to create and manage your projects and tasks on a powerful and flexible platform.
                </p>
            </div>

            <div className="flex items-center gap-3">
                {auth.user ? (
                    <Link href={dashboard.url()}>
                        <Button>Go to Dashboard</Button>
                    </Link>
                ) : (
                    <>
                        <Link href={login.url()}>
                            <Button>Sign In</Button>
                        </Link>
                        <Link href={register.url()}>
                            <Button variant="secondary">Create Account</Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
