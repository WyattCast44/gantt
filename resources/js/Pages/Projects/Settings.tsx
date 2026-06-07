import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import Fieldset, { FieldRow } from '@/components/ui/fieldset';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Label from '@/components/ui/label';
import PageHeader from '@/components/ui/page-header';
import SectionNav, { type SectionNavItem } from '@/components/ui/section-nav';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { destroy as invitationDestroy, store as invitationStore } from '@/routes/projects/invitations';
import { destroy as memberDestroy, update as memberUpdate } from '@/routes/projects/members';
import { archive as projectArchive, settings as projectSettings, update as projectUpdate } from '@/routes/projects';
import { type Project, type ProjectInvitation, type ProjectMember } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Copy, Settings2, Trash2, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type SettingsProps = {
    project: Project;
    members: ProjectMember[];
    invitations: ProjectInvitation[];
};

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
];

type TabKey = 'general' | 'members' | 'danger';

function useActiveTab(): TabKey {
    const page = usePage();
    const query = new URLSearchParams(page.url.split('?')[1] ?? '');
    const tab = query.get('tab');

    return tab === 'members' || tab === 'danger' ? tab : 'general';
}

export default function Settings({ project, members, invitations }: SettingsProps) {
    const tab = useActiveTab();
    const settingsUrl = projectSettings.url(project.id);

    const tabs: SectionNavItem<TabKey>[] = [
        { key: 'general', label: 'General', href: settingsUrl, icon: Settings2 },
        { key: 'members', label: 'Members', href: `${settingsUrl}?tab=members`, icon: Users },
        { key: 'danger', label: 'Danger', href: `${settingsUrl}?tab=danger`, icon: AlertTriangle },
    ];

    return (
        <AppLayout title={`${project.name} · Settings`} project={project}>
            <div className="flex flex-col gap-6">
                <PageHeader title="Settings" description={project.name} />

                <div className="flex flex-col gap-6 sm:flex-row">
                    <SectionNav items={tabs} activeKey={tab} />

                    <div className="min-w-0 flex-1">
                        {tab === 'general' && <GeneralTab project={project} />}
                        {tab === 'members' && (
                            <MembersTab project={project} members={members} invitations={invitations} />
                        )}
                        {tab === 'danger' && <DangerTab project={project} />}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function GeneralTab({ project }: { project: Project }) {
    const form = useForm({
        name: project.name,
        description: project.description ?? '',
        start_date: project.start_date ?? '',
        end_date: project.end_date ?? '',
        status: project.status.value,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(projectUpdate.url(project.id), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit}>
            <Fieldset
                title="General"
                description="Update the project name, dates, and status."
                footer={
                    <Button type="submit" disabled={form.processing}>
                        Save changes
                    </Button>
                }
            >
                <FieldRow label="Name" htmlFor="name" required>
                    <Input
                        id="name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        required
                    />
                    <InputError message={form.errors.name} className="mt-1" />
                </FieldRow>
                <FieldRow label="Description" htmlFor="description">
                    <Textarea
                        id="description"
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                    />
                    <InputError message={form.errors.description} className="mt-1" />
                </FieldRow>
                <FieldRow label="Start date" htmlFor="start_date">
                    <Input
                        id="start_date"
                        type="date"
                        value={form.data.start_date}
                        onChange={(event) => form.setData('start_date', event.target.value)}
                    />
                    <InputError message={form.errors.start_date} className="mt-1" />
                </FieldRow>
                <FieldRow label="End date" htmlFor="end_date">
                    <Input
                        id="end_date"
                        type="date"
                        value={form.data.end_date}
                        onChange={(event) => form.setData('end_date', event.target.value)}
                    />
                    <InputError message={form.errors.end_date} className="mt-1" />
                </FieldRow>
                <FieldRow label="Status" htmlFor="status">
                    <Select
                        id="status"
                        value={form.data.status}
                        onChange={(event) => form.setData('status', event.target.value as Project['status']['value'])}
                        className="max-w-48"
                    >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </Select>
                    <InputError message={form.errors.status} className="mt-1" />
                </FieldRow>
            </Fieldset>
        </form>
    );
}

function MembersTab({
    project,
    members,
    invitations,
}: {
    project: Project;
    members: ProjectMember[];
    invitations: ProjectInvitation[];
}) {
    const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);

    const inviteForm = useForm({ email: '', role: 'editor' });

    const submitInvite = (event: FormEvent) => {
        event.preventDefault();
        inviteForm.post(invitationStore.url(project.id), {
            preserveScroll: true,
            onSuccess: () => inviteForm.reset('email'),
        });
    };

    const changeRole = (member: ProjectMember, role: string) => {
        router.patch(
            memberUpdate.url({ project: project.id, user: member.id }),
            { role },
            { preserveScroll: true },
        );
    };

    const removeMember = () => {
        if (!confirmRemove) {
            return;
        }
        router.delete(memberDestroy.url({ project: project.id, user: confirmRemove.id }), {
            preserveScroll: true,
            onFinish: () => setConfirmRemove(null),
        });
    };

    const copyLink = (url: string) => {
        void navigator.clipboard?.writeText(url);
    };

    return (
        <div className="flex flex-col gap-8">
            <section>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Members</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                    People with access to this project.
                </p>
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border dark:divide-border-dark dark:border-border-dark">
                    {members.map((member) => (
                        <div key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                    {member.name}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-neutral-400">{member.email}</p>
                            </div>
                            {member.is_owner ? (
                                <Badge tone="accent">Owner</Badge>
                            ) : (
                                <>
                                    <Select
                                        aria-label={`Role for ${member.name}`}
                                        value={member.role.value}
                                        onChange={(event) => changeRole(member, event.target.value)}
                                        className="max-w-36"
                                    >
                                        {ROLE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setConfirmRemove(member)}
                                        aria-label={`Remove ${member.name}`}
                                        className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Invite a member</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                    They&apos;ll receive an email with a link to join.
                </p>
                <form onSubmit={submitInvite} className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="min-w-56 flex-1">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={inviteForm.data.email}
                            onChange={(event) => inviteForm.setData('email', event.target.value)}
                            required
                        />
                        <InputError message={inviteForm.errors.email} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                            id="invite-role"
                            value={inviteForm.data.role}
                            onChange={(event) => inviteForm.setData('role', event.target.value)}
                            className="max-w-36"
                        >
                            {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <Button type="submit" disabled={inviteForm.processing}>
                        Send invite
                    </Button>
                </form>
            </section>

            {invitations.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Pending invitations</h2>
                    <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border dark:divide-border-dark dark:border-border-dark">
                        {invitations.map((invitation) => (
                            <div key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                        {invitation.email}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                                        {invitation.role.label}
                                    </p>
                                </div>
                                <Badge tone="warning">{invitation.status.label}</Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyLink(invitation.accept_url)}
                                    aria-label="Copy invite link"
                                >
                                    <Copy className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        router.delete(
                                            invitationDestroy.url({ project: project.id, invitation: invitation.id }),
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Revoke
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <ConfirmDialog
                open={confirmRemove !== null}
                title="Remove member"
                description={confirmRemove ? `Remove ${confirmRemove.name} from this project?` : ''}
                confirmLabel="Remove"
                destructive
                onConfirm={removeMember}
                onCancel={() => setConfirmRemove(null)}
            />
        </div>
    );
}

function DangerTab({ project }: { project: Project }) {
    const [confirmArchive, setConfirmArchive] = useState(false);

    return (
        <section>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Danger zone</h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/5">
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Archive this project</p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Archived projects are hidden from the workspace list and can be restored later.
                    </p>
                </div>
                <Button variant="danger" onClick={() => setConfirmArchive(true)} disabled={!project.can.delete}>
                    Archive
                </Button>
            </div>

            <ConfirmDialog
                open={confirmArchive}
                title="Archive project"
                description={`Archive “${project.name}”? You can restore it from the projects list.`}
                confirmLabel="Archive"
                destructive
                onConfirm={() => router.delete(projectArchive.url(project.id))}
                onCancel={() => setConfirmArchive(false)}
            />
        </section>
    );
}
