import Logo from '@/components/shell/logo';
import Card from '@/components/ui/card';
import { welcome } from '@/routes';
import { focusRingNeutral } from '@/utils/focusRing';
import { cn } from '@/utils/cn';
import { Head, Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type AuthLayoutProps = PropsWithChildren<{
    title: string;
    description?: string;
}>;

export default function AuthLayout({ title, description, children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-neutral-950">
            <Head title={title} />

            <Link
                href={welcome.url()}
                aria-label="Gantt — back to home"
                className={cn('rounded-md', focusRingNeutral)}
            >
                <Logo size="lg" />
            </Link>

            <div className="w-full max-w-md">
                <Card>
                    <div className="mb-4">
                        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
                        {description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{description}</p>
                        )}
                    </div>

                    {children}
                </Card>
            </div>
        </div>
    );
}
