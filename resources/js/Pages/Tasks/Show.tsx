import ActivityLog from '@/components/activity-log';
import CommentsThread from '@/components/comments-section';
import Badge from '@/components/ui/badge';
import Button, { buttonClasses } from '@/components/ui/button';
import Card from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import InputError from '@/components/ui/input-error';
import Select from '@/components/ui/select';
import SectionNav, { type SectionNavItem } from '@/components/ui/section-nav';
import UploadDocumentModal from '@/Pages/Documents/Partials/UploadDocumentModal';
import TaskForm from '@/Pages/Tasks/Partials/TaskForm';
import { riskTone, statusTone } from '@/Pages/Tasks/Partials/badges';
import AppLayout from '@/layouts/app-layout';
import { destroy as taskCommentDestroy, store as taskCommentStore, update as taskCommentUpdate } from '@/routes/projects/tasks/comments';
import { destroy as dependencyDestroy, store as dependencyStore } from '@/routes/projects/tasks/dependencies';
import { destroy as taskDocumentDestroy, store as taskDocumentStore, upload as taskDocumentUpload } from '@/routes/projects/tasks/documents';
import { destroy as taskDestroy, index as tasksIndex, show as taskShow } from '@/routes/projects/tasks';
import { type BaseClassificationValue, type Dependency, type Document, type Project, type Task } from '@/types';
import { allowedClassifications } from '@/utils/classification';
import { formatDateTime } from '@/utils/date';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, GitBranch, History, Info, Lock, LockOpen, MessageSquare, Paperclip, Pencil, Trash2, Upload } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

type TabKey = 'details' | 'comments' | 'dependencies' | 'attachments' | 'history' | 'edit';

function useActiveTab(canEdit: boolean): TabKey {
    const page = usePage();
    const tab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');

    if (tab === 'edit') {
        return canEdit ? 'edit' : 'details';
    }

    if (tab === 'comments') {
        return 'comments';
    }

    if (tab === 'dependencies') {
        return 'dependencies';
    }

    if (tab === 'attachments') {
        return 'attachments';
    }

    if (tab === 'history') {
        return 'history';
    }

    return 'details';
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:gap-4 dark:border-border-dark">
            <dt className="text-sm text-slate-500 sm:w-44 sm:shrink-0 dark:text-neutral-400">{label}</dt>
            <dd className="min-w-0 text-sm text-slate-900 dark:text-white">{children}</dd>
        </div>
    );
}

function DetailsPane({ task }: { task: Task }) {
    return (
        <Card padding="none">
            <dl>
                <DetailRow label="Status">
                    <Badge tone={statusTone(task.status.value)}>{task.status.label}</Badge>
                </DetailRow>
                <DetailRow label="Risk">
                    <Badge tone={riskTone(task.risk_level.value)}>{task.risk_level.label}</Badge>
                </DetailRow>
                <DetailRow label="Classification">
                    <Badge tone="accent">{task.base_classification.label}</Badge>
                </DetailRow>
                <DetailRow label="Start date">{task.start_date ?? <span className="text-slate-400 dark:text-neutral-500">Unscheduled</span>}</DetailRow>
                <DetailRow label="Duration">{task.duration_days} day{task.duration_days === 1 ? '' : 's'}</DetailRow>
                <DetailRow label="End date">{task.end_date ?? <span className="text-slate-400 dark:text-neutral-500">—</span>}</DetailRow>
                <DetailRow label="Dates">
                    <span className="inline-flex items-center gap-1.5">
                        {task.is_date_locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <LockOpen className="h-3.5 w-3.5" aria-hidden />}
                        {task.is_date_locked ? 'Locked' : 'Unlocked'}
                    </span>
                </DetailRow>
                <DetailRow label="Percent complete">{task.percent_complete}%</DetailRow>
                <DetailRow label="Organization">{task.organization ?? <span className="text-slate-400 dark:text-neutral-500">—</span>}</DetailRow>
                <DetailRow label="Tags">
                    {task.tags.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                            {task.tags.map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                            ))}
                        </span>
                    ) : (
                        <span className="text-slate-400 dark:text-neutral-500">—</span>
                    )}
                </DetailRow>
                <DetailRow label="Description">
                    {task.description ? (
                        <span className="whitespace-pre-wrap">{task.description}</span>
                    ) : (
                        <span className="text-slate-400 dark:text-neutral-500">No description.</span>
                    )}
                </DetailRow>
                <DetailRow label="Created">{task.created_at ? formatDateTime(task.created_at) : '—'}</DetailRow>
            </dl>
        </Card>
    );
}

function AttachmentsPane({
    project,
    task,
    projectDocuments,
    options,
    canEdit,
}: {
    project: Project;
    task: Task;
    projectDocuments: Document[];
    options: ReturnType<typeof allowedClassifications>;
    canEdit: boolean;
}) {
    const attached = task.documents ?? [];
    const attachedIds = new Set(attached.map((document) => document.id));
    const candidates = projectDocuments.filter((document) => !attachedIds.has(document.id));

    const [uploadOpen, setUploadOpen] = useState(false);
    const attachForm = useForm<{ document_id: string }>({ document_id: '' });
    const detachForm = useForm({});

    const submit = (event: FormEvent) => {
        event.preventDefault();
        attachForm.post(taskDocumentStore.url([project.id, task.id]), {
            preserveScroll: true,
            onSuccess: () => attachForm.reset('document_id'),
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {canEdit && (
                <Card className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Attach a document</p>
                        <Button variant="secondary" onClick={() => setUploadOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" aria-hidden />
                            Upload new
                        </Button>
                    </div>
                    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="flex-1">
                            <Select
                                aria-label="Existing document"
                                value={attachForm.data.document_id}
                                onChange={(event) => attachForm.setData('document_id', event.target.value)}
                            >
                                <option value="">Select an existing document…</option>
                                {candidates.map((document) => (
                                    <option key={document.id} value={document.id}>
                                        {document.name}
                                    </option>
                                ))}
                            </Select>
                            <InputError message={attachForm.errors.document_id} className="mt-1" />
                        </div>
                        <Button type="submit" disabled={attachForm.processing || attachForm.data.document_id === ''}>
                            Attach
                        </Button>
                    </form>
                </Card>
            )}

            {attached.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 py-16 text-center">
                    <Paperclip className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                    <p className="text-sm text-slate-600 dark:text-neutral-400">No documents attached yet.</p>
                </Card>
            ) : (
                <Card padding="none" className="overflow-hidden">
                    <ul>
                        {attached.map((document) => (
                            <li
                                key={document.id}
                                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 dark:border-border-dark"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <Paperclip className="h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                                    <Link
                                        href={`/projects/${project.id}/documents/${document.id}`}
                                        className="truncate text-sm text-slate-900 hover:text-accent-700 dark:text-white dark:hover:text-accent-300"
                                    >
                                        {document.name}
                                    </Link>
                                    <Badge tone="accent">{document.base_classification.label}</Badge>
                                    <span className="text-xs text-slate-400 dark:text-neutral-500">{document.size_label}</span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <a href={document.download_url} className={buttonClasses('ghost', 'icon')} aria-label={`Download ${document.name}`}>
                                        <Download className="h-4 w-4" aria-hidden />
                                    </a>
                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Detach ${document.name}`}
                                            disabled={detachForm.processing}
                                            onClick={() =>
                                                detachForm.delete(taskDocumentDestroy.url([project.id, task.id, document.id]), {
                                                    preserveScroll: true,
                                                })
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden />
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <UploadDocumentModal
                project={project}
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                options={options}
                action={taskDocumentUpload.url([project.id, task.id])}
            />
        </div>
    );
}

function DependenciesPane({
    project,
    task,
    availableTasks,
    canEdit,
}: {
    project: Project;
    task: Task;
    availableTasks: Dependency[];
    canEdit: boolean;
}) {
    const predecessors = task.predecessors ?? [];
    const successors = task.successors ?? [];
    const predecessorIds = new Set(predecessors.map((predecessor) => predecessor.id));
    const candidates = availableTasks.filter((candidate) => !predecessorIds.has(candidate.id));

    const addForm = useForm<{ predecessor_id: string }>({ predecessor_id: '' });
    const removeForm = useForm({});

    const submit = (event: FormEvent) => {
        event.preventDefault();
        addForm.post(dependencyStore.url([project.id, task.id]), {
            preserveScroll: true,
            onSuccess: () => addForm.reset('predecessor_id'),
        });
    };

    return (
        <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Depends on</h2>
                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                        Predecessors that must finish before this task can start (finish-to-start).
                    </p>
                </div>

                {canEdit && (
                    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="flex-1">
                            <Select
                                aria-label="Predecessor task"
                                value={addForm.data.predecessor_id}
                                onChange={(event) => addForm.setData('predecessor_id', event.target.value)}
                            >
                                <option value="">Select a task…</option>
                                {candidates.map((candidate) => (
                                    <option key={candidate.id} value={candidate.id}>
                                        {candidate.name}
                                    </option>
                                ))}
                            </Select>
                            <InputError message={addForm.errors.predecessor_id} className="mt-1" />
                        </div>
                        <Button type="submit" disabled={addForm.processing || addForm.data.predecessor_id === ''}>
                            Add
                        </Button>
                    </form>
                )}

                {predecessors.length === 0 ? (
                    <Card className="flex flex-col items-center gap-3 py-12 text-center">
                        <GitBranch className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <p className="text-sm text-slate-600 dark:text-neutral-400">No predecessors yet.</p>
                    </Card>
                ) : (
                    <Card padding="none" className="overflow-hidden">
                        <ul>
                            {predecessors.map((predecessor) => (
                                <li
                                    key={predecessor.id}
                                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 dark:border-border-dark"
                                >
                                    <Link
                                        href={taskShow.url([project.id, predecessor.id])}
                                        className="truncate text-sm text-slate-900 hover:text-accent-700 dark:text-white dark:hover:text-accent-300"
                                    >
                                        {predecessor.name}
                                    </Link>
                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove ${predecessor.name}`}
                                            disabled={removeForm.processing}
                                            onClick={() =>
                                                removeForm.delete(dependencyDestroy.url([project.id, task.id, predecessor.id]), {
                                                    preserveScroll: true,
                                                })
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden />
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Required by</h2>
                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                        Successor tasks that depend on this one. Manage these from each successor's Dependencies tab.
                    </p>
                </div>

                {successors.length === 0 ? (
                    <Card className="flex flex-col items-center gap-3 py-12 text-center">
                        <GitBranch className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <p className="text-sm text-slate-600 dark:text-neutral-400">Nothing depends on this task yet.</p>
                    </Card>
                ) : (
                    <Card padding="none" className="overflow-hidden">
                        <ul>
                            {successors.map((successor) => (
                                <li
                                    key={successor.id}
                                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 dark:border-border-dark"
                                >
                                    <Link
                                        href={taskShow.url([project.id, successor.id])}
                                        className="truncate text-sm text-slate-900 hover:text-accent-700 dark:text-white dark:hover:text-accent-300"
                                    >
                                        {successor.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </section>
        </div>
    );
}

export default function Show({
    project,
    task,
    availableTasks,
    projectDocuments,
}: {
    project: Project;
    task: Task;
    availableTasks: Dependency[];
    projectDocuments: Document[];
}) {
    const canEdit = project.can.update;
    const tab = useActiveTab(canEdit);
    const showUrl = taskShow.url([project.id, task.id]);
    const [deleting, setDeleting] = useState(false);

    const comments = task.comments ?? [];
    const activities = task.activities ?? [];
    const dependencyCount = (task.predecessors?.length ?? 0) + (task.successors?.length ?? 0);

    const options = useMemo(
        () => allowedClassifications(project.base_classification.value as BaseClassificationValue),
        [project.base_classification.value],
    );

    const deleteForm = useForm({});

    const tabs: SectionNavItem<TabKey>[] = [
        { key: 'details', label: 'Details', href: `${showUrl}?tab=details`, icon: Info },
        {
            key: 'comments',
            label: `Comments${comments.length > 0 ? ` (${comments.length})` : ''}`,
            href: `${showUrl}?tab=comments`,
            icon: MessageSquare,
        },
        {
            key: 'dependencies',
            label: `Dependencies${dependencyCount > 0 ? ` (${dependencyCount})` : ''}`,
            href: `${showUrl}?tab=dependencies`,
            icon: GitBranch,
        },
        {
            key: 'attachments',
            label: `Attachments${(task.documents?.length ?? 0) > 0 ? ` (${task.documents?.length})` : ''}`,
            href: `${showUrl}?tab=attachments`,
            icon: Paperclip,
        },
        { key: 'history', label: 'History', href: `${showUrl}?tab=history`, icon: History },
        ...(canEdit ? [{ key: 'edit' as const, label: 'Edit', href: `${showUrl}?tab=edit`, icon: Pencil }] : []),
    ];

    return (
        <AppLayout title={task.name} project={project}>
            <div className="flex flex-col gap-6">
                <div className="min-w-0">
                    <Link
                        href={tasksIndex.url(project.id)}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Tasks
                    </Link>
                    <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{task.name}</h1>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row">
                    <SectionNav items={tabs} activeKey={tab} />

                    <div className="min-w-0 flex-1">
                        {tab === 'details' && <DetailsPane task={task} />}
                        {tab === 'comments' && (
                            <CommentsThread
                                comments={comments}
                                canComment={canEdit}
                                options={options}
                                storeUrl={taskCommentStore.url([project.id, task.id])}
                                buildUpdateUrl={(commentId) => taskCommentUpdate.url([project.id, task.id, commentId])}
                                buildDestroyUrl={(commentId) => taskCommentDestroy.url([project.id, task.id, commentId])}
                            />
                        )}
                        {tab === 'dependencies' && (
                            <DependenciesPane project={project} task={task} availableTasks={availableTasks} canEdit={canEdit} />
                        )}
                        {tab === 'attachments' && (
                            <AttachmentsPane project={project} task={task} projectDocuments={projectDocuments} options={options} canEdit={canEdit} />
                        )}
                        {tab === 'history' && <ActivityLog activities={activities} />}
                        {tab === 'edit' && canEdit && (
                            <div className="flex flex-col gap-6">
                                <TaskForm project={project} task={task} options={options} />

                                <Card className="flex flex-col gap-3 border-red-200 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/40">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Delete task</p>
                                        <p className="text-sm text-slate-500 dark:text-neutral-400">Permanently removes this task and all its subtasks.</p>
                                    </div>
                                    <Button variant="danger" onClick={() => setDeleting(true)}>
                                        Delete
                                    </Button>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleting}
                title="Delete task"
                description={`“${task.name}” and all its subtasks will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={() => deleteForm.delete(taskDestroy.url([project.id, task.id]))}
                onCancel={() => setDeleting(false)}
            />
        </AppLayout>
    );
}
