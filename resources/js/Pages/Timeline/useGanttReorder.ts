import { reorder as reorderRoute } from '@/routes/projects/tasks';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Task } from '@/types';
import { HEADER_HEIGHT, ROW_HEIGHT } from '@/utils/gantt';
import { type GanttRow } from '@/utils/ganttLayout';
import { router } from '@inertiajs/react';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

type DragContext = {
    task: Task;
    parentId: number | null;
    siblingIds: number[];
    orderedIds: number[];
};

type ReorderPreview = {
    /** The task being dragged. */
    taskId: number;
    /** Body-relative pixel Y where the drop indicator should render. */
    dropTop: number;
};

/** Move `id` to insertion slot `insertion` (counted among the original group). */
function moveToSlot(siblingIds: number[], id: number, insertion: number): number[] {
    const without = siblingIds.filter((value) => value !== id);
    const original = siblingIds.indexOf(id);
    let target = original < insertion ? insertion - 1 : insertion;
    target = Math.max(0, Math.min(target, without.length));
    without.splice(target, 0, id);

    return without;
}

/**
 * Reorder tasks within their sibling group, by buttons or custom vertical drag.
 * `commit` is shared by both: it optimistically reorders the store, then PATCHes
 * the reorder route (Inertia reload reconciles / rolls back). Drag maps the
 * pointer to the nearest sibling slot and exposes a drop-indicator position.
 */
export function useGanttReorder(projectId: number, canEdit: boolean, rows: GanttRow[], scrollRef: RefObject<HTMLDivElement | null>) {
    const reorderSiblings = useGanttStore((state) => state.reorderSiblings);
    const [preview, setPreview] = useState<ReorderPreview | null>(null);
    const context = useRef<DragContext | null>(null);

    // Keep the latest rows available to the pointer handlers without re-binding.
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    const commit = useCallback(
        (parentId: number | null, orderedIds: number[]) => {
            reorderSiblings(parentId, orderedIds);
            router.patch(
                reorderRoute.url(projectId),
                { parent_id: parentId, ordered_ids: orderedIds },
                { preserveScroll: true, preserveState: true },
            );
        },
        [projectId, reorderSiblings],
    );

    const startReorder = useCallback(
        (task: Task, siblingIds: number[], event: React.PointerEvent) => {
            if (!canEdit || siblingIds.length < 2) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            context.current = { task, parentId: task.parent_id, siblingIds, orderedIds: siblingIds };
            setPreview({ taskId: task.id, dropTop: 0 });
        },
        [canEdit],
    );

    useEffect(() => {
        if (preview === null) {
            return;
        }

        const onMove = (event: PointerEvent): void => {
            const element = scrollRef.current;
            const ctx = context.current;

            if (element === null || ctx === null) {
                return;
            }

            const siblingRows = rowsRef.current
                .filter((row) => ctx.siblingIds.includes(row.task.id))
                .sort((a, b) => a.top - b.top);

            if (siblingRows.length === 0) {
                return;
            }

            const rect = element.getBoundingClientRect();
            const relativeY = element.scrollTop + (event.clientY - rect.top) - HEADER_HEIGHT;
            const insertion = siblingRows.filter((row) => row.top + ROW_HEIGHT / 2 < relativeY).length;

            ctx.orderedIds = moveToSlot(ctx.siblingIds, ctx.task.id, insertion);

            const dropTop = dropIndicatorTop(insertion, siblingRows, rowsRef.current);
            setPreview({ taskId: ctx.task.id, dropTop });
        };

        const onUp = (): void => {
            const ctx = context.current;
            context.current = null;
            setPreview(null);

            if (ctx !== null && !sameOrder(ctx.siblingIds, ctx.orderedIds)) {
                commit(ctx.parentId, ctx.orderedIds);
            }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [preview === null, commit, scrollRef]);

    return { preview, startReorder, commit };
}

/** Body-relative Y of the drop line for a given insertion slot. */
function dropIndicatorTop(insertion: number, siblingRows: GanttRow[], allRows: GanttRow[]): number {
    if (insertion < siblingRows.length) {
        return siblingRows[insertion].top;
    }

    // Inserting at the end: drop below the last sibling's whole subtree.
    const last = siblingRows[siblingRows.length - 1];
    const lastIndex = allRows.findIndex((row) => row.task.id === last.task.id);
    let cursor = lastIndex + 1;

    while (cursor < allRows.length && allRows[cursor].depth > last.depth) {
        cursor += 1;
    }

    return cursor < allRows.length ? allRows[cursor].top : allRows.length * ROW_HEIGHT;
}

function sameOrder(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}
