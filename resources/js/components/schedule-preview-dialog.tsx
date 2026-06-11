import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { reschedule as taskReschedule, update as taskUpdate } from '@/routes/projects/tasks';
import { store as dependencyStore } from '@/routes/projects/tasks/dependencies';
import { type SchedulePreview, type SharedProps } from '@/types';
import { formatLongDateFromInput } from '@/utils/date';
import { router, usePage } from '@inertiajs/react';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

/**
 * The rules-engine dry-run confirmation. When a schedule edit's cascade would
 * introduce conflicts, the backend flashes the preview instead of committing;
 * this dialog lists what would move and which dependencies would be violated,
 * then either resubmits the original input with `confirm: true` or drops it.
 * Mount once per page that issues schedule edits (timeline, task form pages).
 */
export default function SchedulePreviewDialog({ projectId }: { projectId: number }) {
    const preview = usePage<SharedProps>().props.flash.schedulePreview;
    const [dismissed, setDismissed] = useState<SchedulePreview | null>(null);
    const [processing, setProcessing] = useState(false);

    const open = preview !== null && preview !== undefined && preview !== dismissed;

    if (!open) {
        return null;
    }

    const confirm = () => {
        const data = { ...preview.input, confirm: true };
        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setDismissed(preview);
            },
        };

        if (preview.intent === 'dependency') {
            router.post(dependencyStore.url([projectId, preview.task_id]), data, options);
        } else if (preview.intent === 'update') {
            router.patch(taskUpdate.url([projectId, preview.task_id]), data, options);
        } else {
            router.patch(taskReschedule.url([projectId, preview.task_id]), data, options);
        }
    };

    const date = (value: string | null): string => (value === null ? '—' : (formatLongDateFromInput(value) ?? value));

    return (
        <Modal open onClose={() => setDismissed(preview)} title="This change creates schedule conflicts">
            <div className="flex flex-col gap-4 text-sm">
                {preview.conflicts.length > 0 && (
                    <div>
                        <p className="mb-2 font-medium text-slate-900 dark:text-white">
                            {preview.conflicts.length === 1 ? 'Conflicted dependency' : 'Conflicted dependencies'}
                        </p>
                        <ul className="flex flex-col gap-2">
                            {preview.conflicts.map((conflict) => (
                                <li
                                    key={`${conflict.predecessor_id}-${conflict.successor_id}`}
                                    className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                                >
                                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                    <span>
                                        <strong>{conflict.successor_name}</strong> is locked and would start {date(conflict.successor_start)},
                                        before <strong>{conflict.predecessor_name}</strong> finishes ({date(conflict.predecessor_end)}).
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {preview.moves.length > 0 && (
                    <div>
                        <p className="mb-2 font-medium text-slate-900 dark:text-white">
                            {preview.moves.length === 1 ? 'This task will also move' : 'These tasks will also move'}
                        </p>
                        <ul className="flex flex-col gap-1">
                            {preview.moves.map((move) => (
                                <li key={move.task_id} className="flex items-center gap-2 text-slate-700 dark:text-neutral-300">
                                    <span className="font-medium">{move.name}</span>
                                    <span className="text-slate-500 dark:text-neutral-400">{date(move.from_start)}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                    <span>{date(move.to_start)}</span>
                                    {move.reason === 'deadline_compression' && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                            (compressed to {move.to_duration} days)
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="text-slate-600 dark:text-neutral-400">
                    Locked tasks never move automatically. Apply the change and leave the conflicted dependencies flagged on the
                    timeline, or cancel to keep the current schedule.
                </p>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setDismissed(preview)} disabled={processing}>
                        Cancel
                    </Button>
                    <Button onClick={confirm} disabled={processing}>
                        Apply anyway
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
