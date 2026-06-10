import FlashMessages from '@/components/shell/flash-messages';
import ProjectSwitcher from '@/components/shell/project-switcher';
import ResizableSidebar from '@/components/shell/resizable-sidebar';
import SidebarNav from '@/components/shell/sidebar-nav';
import TopNav from '@/components/shell/top-nav';
import { type Project } from '@/types';
import { Head } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type AppLayoutProps = PropsWithChildren<{
    title: string;
    /** When inside a project workspace, drives the project-scoped sidebar + search. */
    project?: Project;
    /**
     * Render the page edge-to-edge with no centered container or padding, and
     * let the page own its internal scrolling/height (the Gantt timeline fills
     * the viewport rather than scrolling within a max-width column).
     */
    fullBleed?: boolean;
}>;

export default function AppLayout({ title, project, fullBleed = false, children }: AppLayoutProps) {
    return (
        <div className="flex h-screen flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            <Head title={title} />
            <FlashMessages />

            <TopNav />

            <div className="flex min-h-0 flex-1">
                <ResizableSidebar>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <ProjectSwitcher currentProjectId={project?.id} />
                        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                            <SidebarNav project={project} />
                        </div>
                    </div>
                </ResizableSidebar>

                {fullBleed ? (
                    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
                ) : (
                    <main className="min-w-0 flex-1 overflow-auto">
                        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
                    </main>
                )}
            </div>
        </div>
    );
}
