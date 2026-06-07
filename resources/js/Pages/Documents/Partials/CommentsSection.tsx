import Avatar from '@/components/ui/avatar';
import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import InputError from '@/components/ui/input-error';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import { store as commentStore, update as commentUpdate, destroy as commentDestroy } from '@/routes/projects/documents/comments';
import { CLASSIFICATIONS, type BaseClassificationValue, type Comment, type Document, type Project } from '@/types';
import { formatDateTime, formatRelativeDate } from '@/utils/date';
import { useForm } from '@inertiajs/react';
import { MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type CommentsSectionProps = {
    project: Project;
    document: Document;
    /** Classification options capped at the project baseline. */
    options: typeof CLASSIFICATIONS;
};

/**
 * The comment thread for a document. Editors+ can post; authors can edit/delete
 * their own; owners/admins can delete any. Abilities arrive per comment in the
 * `can` block from CommentResource.
 */
export default function CommentsSection({ project, document, options }: CommentsSectionProps) {
    const comments = document.comments;
    const canComment = project.can.update;

    return (
        <div className="flex flex-col gap-6">
            {canComment && <CommentComposer project={project} document={document} options={options} />}

            {comments.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 py-16 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                    <p className="text-sm text-slate-600 dark:text-neutral-400">No comments yet.</p>
                </Card>
            ) : (
                <ul className="flex flex-col gap-3">
                    {comments.map((comment) => (
                        <CommentRow key={comment.id} project={project} document={document} comment={comment} options={options} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function CommentComposer({ project, document, options }: CommentsSectionProps) {
    const form = useForm<{ body: string; base_classification: BaseClassificationValue }>({
        body: '',
        base_classification: 'unclassified',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(commentStore.url([project.id, document.id]), {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    return (
        <Card className="flex flex-col gap-3">
            <form onSubmit={submit} className="flex flex-col gap-3">
                <div>
                    <Textarea
                        aria-label="Add a comment"
                        placeholder="Add a comment…"
                        value={form.data.body}
                        onChange={(event) => form.setData('body', event.target.value)}
                    />
                    <InputError message={form.errors.body} className="mt-1" />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="sm:w-56">
                        <Select
                            aria-label="Comment classification"
                            value={form.data.base_classification}
                            onChange={(event) => form.setData('base_classification', event.target.value as BaseClassificationValue)}
                        >
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <InputError message={form.errors.base_classification} className="mt-1" />
                    </div>

                    <Button type="submit" disabled={form.processing || form.data.body.trim() === ''}>
                        Comment
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function CommentRow({
    project,
    document,
    comment,
    options,
}: {
    project: Project;
    document: Document;
    comment: Comment;
    options: typeof CLASSIFICATIONS;
}) {
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const editForm = useForm<{ body: string; base_classification: BaseClassificationValue }>({
        body: comment.body,
        base_classification: comment.base_classification.value,
    });

    const deleteForm = useForm({});

    const startEditing = () => {
        editForm.setData({ body: comment.body, base_classification: comment.base_classification.value });
        editForm.clearErrors();
        setEditing(true);
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();
        editForm.patch(commentUpdate.url([project.id, document.id, comment.id]), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const authorName = comment.author?.name ?? 'Unknown';

    return (
        <li>
            <Card className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={authorName} className="h-7 w-7 text-[10px]" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{authorName}</p>
                            <time
                                dateTime={comment.created_at ?? undefined}
                                title={comment.created_at ? formatDateTime(comment.created_at) : undefined}
                                className="text-xs text-slate-500 dark:text-neutral-400"
                            >
                                {formatRelativeDate(comment.created_at)}
                            </time>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Badge tone="accent">{comment.base_classification.label}</Badge>

                        {(comment.can.update || comment.can.delete) && !editing && (
                            <DropdownMenu>
                                <DropdownMenuTrigger aria-label="Comment actions" className="p-1 text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                                    <MoreVertical className="h-4 w-4" aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {comment.can.update && (
                                        <DropdownMenuItem onSelect={startEditing}>
                                            <Pencil className="h-4 w-4" aria-hidden />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {comment.can.delete && (
                                        <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-red-600 dark:text-red-400">
                                            <Trash2 className="h-4 w-4" aria-hidden />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {editing ? (
                    <form onSubmit={submitEdit} className="flex flex-col gap-3">
                        <div>
                            <Textarea
                                aria-label="Edit comment"
                                value={editForm.data.body}
                                onChange={(event) => editForm.setData('body', event.target.value)}
                            />
                            <InputError message={editForm.errors.body} className="mt-1" />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="sm:w-56">
                                <Select
                                    aria-label="Comment classification"
                                    value={editForm.data.base_classification}
                                    onChange={(event) =>
                                        editForm.setData('base_classification', event.target.value as BaseClassificationValue)
                                    }
                                >
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                                <InputError message={editForm.errors.base_classification} className="mt-1" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setEditing(false)} disabled={editForm.processing}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing || editForm.data.body.trim() === ''}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-neutral-300">{comment.body}</p>
                )}
            </Card>

            <ConfirmDialog
                open={deleting}
                title="Delete comment"
                description="This comment will be permanently removed. This cannot be undone."
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={() =>
                    deleteForm.delete(commentDestroy.url([project.id, document.id, comment.id]), {
                        preserveScroll: true,
                        onSuccess: () => setDeleting(false),
                    })
                }
                onCancel={() => setDeleting(false)}
            />
        </li>
    );
}
