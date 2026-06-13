import { quickStore } from '@/routes/projects/tasks';
import { useGanttStore } from '@/stores/useGanttStore';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Serialized quick-create queue. Each committed draft name becomes a pending
 * placeholder in the store and a queued POST here; only one POST is in flight
 * at a time, and the next one waits until the previous create has been
 * absorbed into the task tree (see useGanttStore.setTasks) so its insert-after
 * anchor is correct. A failure stops the queue, clears the placeholders, and
 * reopens the input pre-filled with the failed name and the error message.
 */
export function useQuickCreate(projectId: number) {
    /** Names committed but not yet successfully POSTed (head may be in flight). */
    const queue = useRef<string[]>([]);
    const inFlight = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [failedName, setFailedName] = useState<string | null>(null);

    const flush = useCallback((): void => {
        const state = useGanttStore.getState();

        if (inFlight.current || queue.current.length === 0 || state.quick === null) {
            return;
        }

        // A previous create has not been absorbed into the tree yet — its
        // anchor advance is pending. The store subscription retries.
        if (state.quick.pending.length > queue.current.length) {
            return;
        }

        const name = queue.current[0];
        const { parentId, afterId } = state.quick.position;

        inFlight.current = true;

        router.post(
            quickStore.url(projectId),
            { name, parent_id: parentId, after_id: afterId },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    queue.current = queue.current.slice(1);
                },
                onError: (errors) => {
                    queue.current = [];
                    useGanttStore.getState().clearPending();
                    setFailedName(name);
                    setError(Object.values(errors)[0] ?? 'The task could not be created.');
                },
                onFinish: () => {
                    inFlight.current = false;
                    flush();
                },
            },
        );
    }, [projectId]);

    // Retry the flush whenever the store absorbs a landed create (the next
    // POST's anchor only becomes valid at that point).
    useEffect(() => useGanttStore.subscribe(() => flush()), [flush]);

    const commit = useCallback(
        (name: string): void => {
            setError(null);
            setFailedName(null);
            useGanttStore.getState().commitDraft(name);
            queue.current = [...queue.current, name];
            flush();
        },
        [flush],
    );

    const clearError = useCallback((): void => {
        setError(null);
        setFailedName(null);
    }, []);

    return { commit, error, failedName, clearError };
}
