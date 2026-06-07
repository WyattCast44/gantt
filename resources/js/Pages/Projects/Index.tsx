import Badge from '@/components/ui/badge';
import Button, { ButtonLink } from '@/components/ui/button';
import Card from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import AppLayout from '@/layouts/app-layout';
import { accept as acceptInvitation, decline as declineInvitation } from '@/routes/invitations';
import { create as projectsCreate, restore as projectRestore, show as projectShow } from '@/routes/projects';
import { ROLE_LABELS, type ProjectInvitation, type ProjectSummary } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';

type IndexProps = {
    projects: ProjectSummary[];
    archivedProjects: ProjectSummary[];
    pendingInvitations: ProjectInvitation[];
};

function StatusDot({ status }: { status: ProjectSummary['status'] }) {
    return (
        <span
            className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                status === 'active' ? 'bg-emerald-500' : 'bg-slate-400',
            )}
            aria-hidden
        />
    );
}

function roleTone(role: string | null) {
    return role === 'owner' || role === 'admin' ? 'accent' : 'neutral';
}

export default function Index({ projects, archivedProjects, pendingInvitations }: IndexProps) {
    return (
        <AppLayout title="Projects">
            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Projects"
                    description="Workspaces you own or have been invited to."
                    actions={
                        <ButtonLink href={projectsCreate.url()} className="gap-1.5">
                            <Plus className="h-4 w-4" aria-hidden />
                            New project
                        </ButtonLink>
                    }
                />

                {pendingInvitations.length > 0 && (
                    <Card padding="none">
                        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-slate-900 dark:border-border-dark dark:text-white">
                            Pending invitations
                        </div>
                        <ul className="divide-y divide-border dark:divide-border-dark">
                            {pendingInvitations.map((invitation) => (
                                <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                            {invitation.project?.name ?? 'A project'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                                            {invitation.invited_by ? `Invited by ${invitation.invited_by} · ` : ''}
                                            {invitation.role.label}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => router.post(acceptInvitation.url(invitation.id))}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => router.post(declineInvitation.url(invitation.id))}
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

                {projects.length === 0 ? (
                    <Card>
                        <p className="text-sm text-slate-600 dark:text-neutral-400">
                            You don&apos;t have any projects yet. Create your first one to get started.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={projectShow.url(project.id)}
                                className={cn(
                                    'rounded-lg border border-border bg-white p-4 transition hover:border-accent-400 dark:border-border-dark dark:bg-neutral-900',
                                    focusRingNeutral,
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium text-slate-900 dark:text-white">
                                        {project.name}
                                    </span>
                                    {project.role && (
                                        <Badge tone={roleTone(project.role)}>{ROLE_LABELS[project.role]}</Badge>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                                    <StatusDot status={project.status} />
                                    {project.status === 'active' ? 'Active' : 'Completed'}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {archivedProjects.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Archived</h2>
                        <Card padding="none" className="mt-2">
                            <ul className="divide-y divide-border dark:divide-border-dark">
                                {archivedProjects.map((project) => (
                                    <li key={project.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                        <span className="truncate text-sm text-slate-600 dark:text-neutral-300">
                                            {project.name}
                                        </span>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => router.patch(projectRestore.url(project.id))}
                                        >
                                            Restore
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
