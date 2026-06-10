import { reschedule } from '@/routes/projects/tasks';
import { type Task } from '@/types';
import { addDays } from '@/utils/gantt';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type DragMode = 'move' | 'resize';

export type DragState = {
    taskId: number;
    mode: DragMode;
    /** Snapped day delta from the drag origin (drives the live preview). */
    deltaDays: number;
};

type DragContext = {
    task: Task;
    mode: DragMode;
    deltaDays: number;
    pointerStartX: number;
};

/**
 * Pointer-driven drag-to-reschedule. Moving the bar body shifts start_date;
 * dragging the right edge changes duration_days. Deltas snap to whole days
 * (integer DAY_WIDTH steps). On release it PATCHes the focused reschedule route
 * (optimistically keeping the bar where it was dropped until the server
 * responds, then rolling back on error). Only enabled for editors.
 */
export function useGanttDrag(projectId: number, canEdit: boolean, dayWidth: number) {
    const [drag, setDrag] = useState<DragState | null>(null);
    const context = useRef<DragContext | null>(null);
    const committing = useRef(false);

    const start = useCallback(
        (mode: DragMode, task: Task, event: React.PointerEvent) => {
            if (!canEdit || task.start_date === null || committing.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            context.current = { task, mode, deltaDays: 0, pointerStartX: event.clientX };
            setDrag({ taskId: task.id, mode, deltaDays: 0 });
        },
        [canEdit],
    );

    const startMove = useCallback((task: Task, event: React.PointerEvent) => start('move', task, event), [start]);
    const startResize = useCallback((task: Task, event: React.PointerEvent) => start('resize', task, event), [start]);

    useEffect(() => {
        if (drag === null) {
            return;
        }

        const onMove = (event: PointerEvent): void => {
            const ctx = context.current;

            if (ctx === null) {
                return;
            }

            const deltaDays = Math.round((event.clientX - ctx.pointerStartX) / dayWidth);

            if (deltaDays !== ctx.deltaDays) {
                ctx.deltaDays = deltaDays;
                setDrag((current) => (current === null ? current : { ...current, deltaDays }));
            }
        };

        const onUp = (): void => {
            const ctx = context.current;
            context.current = null;

            if (ctx === null || ctx.task.start_date === null || ctx.deltaDays === 0) {
                setDrag(null);
                return;
            }

            const payload =
                ctx.mode === 'move'
                    ? { start_date: addDays(ctx.task.start_date, ctx.deltaDays), duration_days: ctx.task.duration_days }
                    : { start_date: ctx.task.start_date, duration_days: Math.max(1, ctx.task.duration_days + ctx.deltaDays) };

            committing.current = true;

            router.patch(reschedule.url([projectId, ctx.task.id]), payload, {
                preserveScroll: true,
                preserveState: true,
                // Keep the optimistic preview until the reload (success) or the
                // error (rollback) clears it.
                onFinish: () => {
                    committing.current = false;
                    setDrag(null);
                },
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [drag === null, dayWidth, projectId]);

    return { drag, startMove, startResize };
}
