import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import Modal from '@/components/ui/modal';
import PageHeader from '@/components/ui/page-header';
import { Tooltip } from '@/components/ui/tooltip';
import TaskForm from '@/Pages/Tasks/Partials/TaskForm';
import { flattenTasks, countIncompleteSubtasks, hasIncompleteSubtasks, riskTone, riskTooltip, statusTone, statusTooltip } from '@/Pages/Tasks/Partials/badges';
import AppLayout from '@/layouts/app-layout';
import { complete as taskComplete, destroy as taskDestroy, show as taskShow } from '@/routes/projects/tasks';
import { type BaseClassificationValue, type Project, type Task } from '@/types';
import { allowedClassifications } from '@/utils/classification';
import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronRight, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Tasks deeper than this may not take children (PRD V1 cap of five tiers). */
const MAX_DEPTH = 5;

export default function Index({ project, tasks }: { project: Project; tasks: Task[] }) {
    const [creating, setCreating] = useState(false);
    const [createParentId, setCreateParentId] = useState<number | null>(null);
    const [editing, setEditing] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState<Task | null>(null);
    const [completing, setCompleting] = useState<Task | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const options = useMemo(
        () => allowedClassifications(project.base_classification.value as BaseClassificationValue),
        [project.base_classification.value],
    );

    // Candidate parents are any task still below the depth cap.
    const parentCandidates = useMemo(() => flattenTasks(tasks).filter((task) => task.hierarchy_level < MAX_DEPTH), [tasks]);

    const deleteForm = useForm({});
    const completeForm = useForm<{ include_subtasks: boolean }>({ include_subtasks: false });

    const toggle = (id: number) =>
        setExpanded((previous) => {
            const next = new Set(previous);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const openCreate = (parentId: number | null) => {
        setCreateParentId(parentId);
        setCreating(true);
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        deleteForm.delete(taskDestroy.url([project.id, deleting.id]), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    const requestComplete = (task: Task) => {
        if (hasIncompleteSubtasks(task)) {
            setCompleting(task);

            return;
        }

        completeForm.transform(() => ({ include_subtasks: false }));
        completeForm.post(taskComplete.url([project.id, task.id]), {
            preserveScroll: true,
        });
    };

    const confirmComplete = () => {
        if (!completing) {
            return;
        }

        completeForm.transform(() => ({ include_subtasks: true }));
        completeForm.post(taskComplete.url([project.id, completing.id]), {
            preserveScroll: true,
            onSuccess: () => setCompleting(null),
        });
    };

    return (
        <AppLayout title="Tasks" project={project}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Tasks"
                    description="Plan the work breakdown — nest subtasks up to five levels deep."
                    actions={
                        project.can.update && (
                            <Button onClick={() => openCreate(null)}>
                                <Plus className="mr-2 h-4 w-4" aria-hidden />
                                New task
                            </Button>
                        )
                    }
                />

                {tasks.length === 0 ? (
                    <Card className="flex flex-col items-center gap-2 py-12 text-center">
                        <ListTree className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <p className="text-sm text-slate-600 dark:text-neutral-400">No tasks yet.</p>
                    </Card>
                ) : (
                    <Card padding="none" className="overflow-hidden">
                        <ul className="divide-y divide-border dark:divide-border-dark">
                            {tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    project={project}
                                    task={task}
                                    depth={0}
                                    expanded={expanded}
                                    onToggle={toggle}
                                    onAddChild={openCreate}
                                    onEdit={setEditing}
                                    onDelete={setDeleting}
                                    onComplete={requestComplete}
                                />
                            ))}
                        </ul>
                    </Card>
                )}
            </div>

            {creating && (
                <Modal open onClose={() => setCreating(false)} title="New task">
                    <div className="mt-2">
                        <TaskForm
                            project={project}
                            parents={parentCandidates}
                            defaultParentId={createParentId}
                            options={options}
                            onSuccess={() => setCreating(false)}
                            onCancel={() => setCreating(false)}
                        />
                    </div>
                </Modal>
            )}

            {editing && (
                <Modal open onClose={() => setEditing(null)} title="Edit task">
                    <div className="mt-2">
                        <TaskForm
                            project={project}
                            task={editing}
                            options={options}
                            onSuccess={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                        />
                    </div>
                </Modal>
            )}

            <ConfirmDialog
                open={deleting !== null}
                title="Delete task"
                description={deleting ? `“${deleting.name}” and all its subtasks will be removed. This cannot be undone.` : undefined}
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />

            <ConfirmDialog
                open={completing !== null}
                title="Mark task complete"
                description={
                    completing
                        ? `“${completing.name}” has ${countIncompleteSubtasks(completing)} incomplete subtask${countIncompleteSubtasks(completing) === 1 ? '' : 's'}. Mark this task and all subtasks as complete?`
                        : undefined
                }
                confirmLabel="Mark all complete"
                processing={completeForm.processing}
                onConfirm={confirmComplete}
                onCancel={() => setCompleting(null)}
            />
        </AppLayout>
    );
}

type TaskRowProps = {
    project: Project;
    task: Task;
    depth: number;
    expanded: Set<number>;
    onToggle: (id: number) => void;
    onAddChild: (parentId: number) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onComplete: (task: Task) => void;
};

function TaskRow({ project, task, depth, expanded, onToggle, onAddChild, onEdit, onDelete, onComplete }: TaskRowProps) {
    const children = task.children ?? [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(task.id);
    const canEdit = project.can.update;
    const canHaveChildren = task.hierarchy_level < MAX_DEPTH;
    const isComplete = task.status.value === 'complete';

    return (
        <li>
            <div
                onClick={() => router.visit(taskShow.url([project.id, task.id]))}
                className="group flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800/40"
                style={{ paddingLeft: `${depth * 20 + 12}px` }}
            >
                {hasChildren ? (
                    <Tooltip label={isOpen ? 'Collapse subtasks' : 'Expand subtasks'}>
                        <button
                            type="button"
                            aria-label={isOpen ? 'Collapse subtasks' : 'Expand subtasks'}
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggle(task.id);
                            }}
                            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200"
                        >
                            {isOpen ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                        </button>
                    </Tooltip>
                ) : (
                    <span className="h-5 w-5 shrink-0" aria-hidden />
                )}

                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{task.name}</div>
                    <div className="text-xs text-slate-400 dark:text-neutral-500">
                        {task.start_date ? `${task.start_date} → ${task.end_date}` : 'Unscheduled'} · {task.duration_days}d
                    </div>
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <Tooltip label={statusTooltip(task.status.value)}>
                        <Badge tone={statusTone(task.status.value)}>{task.status.label}</Badge>
                    </Tooltip>
                    <Tooltip label={riskTooltip(task.risk_level.value)}>
                        <Badge tone={riskTone(task.risk_level.value)}>{task.risk_level.label}</Badge>
                    </Tooltip>
                    <span className="w-10 text-right text-xs text-slate-500 tabular-nums dark:text-neutral-400">{task.percent_complete}%</span>
                </div>

                {canEdit && (
                    <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                        {!isComplete && (
                            <Tooltip label="Mark complete">
                                <Button variant="ghost" size="icon" aria-label="Mark complete" onClick={() => onComplete(task)}>
                                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                                </Button>
                            </Tooltip>
                        )}
                        {canHaveChildren && (
                            <Tooltip label="Add subtask">
                                <Button variant="ghost" size="icon" aria-label="Add subtask" onClick={() => onAddChild(task.id)}>
                                    <Plus className="h-4 w-4" aria-hidden />
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip label="Edit task">
                            <Button variant="ghost" size="icon" aria-label="Edit task" onClick={() => onEdit(task)}>
                                <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                        </Tooltip>
                        <Tooltip label="Delete task">
                            <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => onDelete(task)}>
                                <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {hasChildren && isOpen && (
                <ul className="divide-y divide-border dark:divide-border-dark">
                    {children.map((child) => (
                        <TaskRow
                            key={child.id}
                            project={project}
                            task={child}
                            depth={depth + 1}
                            expanded={expanded}
                            onToggle={onToggle}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onComplete={onComplete}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
