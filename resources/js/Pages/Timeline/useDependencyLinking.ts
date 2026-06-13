import { store as dependencyStore } from '@/routes/projects/tasks/dependencies';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Task } from '@/types';
import { HEADER_HEIGHT, LEFT_PANE_WIDTH } from '@/utils/gantt';
import { findTask } from '@/utils/ganttLayout';
import { router } from '@inertiajs/react';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

export type LinkMode = 'drag' | 'click';

/** Pointer position in bar-track content coordinates. */
export type LinkPointer = { x: number; y: number };

/** Pixels from the container's top/bottom edge that trigger autoscroll. */
const AUTOSCROLL_THRESHOLD = 40;

/** Autoscroll speed in px per frame. */
const AUTOSCROLL_STEP = 12;

/** Whether `taskId` is an ancestor or descendant of `otherId`. */
function sharesLineage(roots: Task[], taskId: number, otherId: number): boolean {
    const contains = (task: Task, id: number): boolean => task.id === id || task.children.some((child) => contains(child, id));

    const task = findTask(roots, taskId);
    const other = findTask(roots, otherId);

    if (task === null || other === null) {
        return false;
    }

    return contains(task, other.id) || contains(other, task.id);
}

/**
 * The dependency-linking state machine. One direction everywhere: the source
 * is the predecessor, the clicked/dropped task becomes the successor. Two
 * entry modes drive the same state: dragging from a bar's finish-side handle
 * (release on a target completes, release elsewhere cancels) and the context
 * menu's click-to-complete mode (sticky until a click or Escape). While
 * linking, the viewport autoscrolls vertically near the container's edges.
 *
 * Conflicts ride the existing dry-run protocol: the server flashes
 * `schedulePreview` and the mounted SchedulePreviewDialog confirms/cancels.
 */
export function useDependencyLinking(projectId: number, canEdit: boolean, scrollRef: RefObject<HTMLDivElement | null>) {
    const linking = useGanttStore((state) => state.linking);
    const [mode, setMode] = useState<LinkMode | null>(null);
    const [pointer, setPointer] = useState<LinkPointer | null>(null);
    const [hoverId, setHoverId] = useState<number | null>(null);
    const clientPosition = useRef<{ x: number; y: number } | null>(null);
    const committing = useRef(false);

    const sourceTask = linking === null ? null : findTask(useGanttStore.getState().tasks, linking.sourceTaskId);

    const cancel = useCallback((): void => {
        useGanttStore.getState().stopLinking();
        setMode(null);
        setPointer(null);
        setHoverId(null);
        clientPosition.current = null;
    }, []);

    /** Why `target` cannot become the source's successor (null = valid). */
    const targetError = useCallback(
        (targetId: number): string | null => {
            if (linking === null) {
                return null;
            }

            const sourceId = linking.sourceTaskId;

            if (targetId === sourceId) {
                return 'A task cannot depend on itself.';
            }

            const tasks = useGanttStore.getState().tasks;

            if (sharesLineage(tasks, sourceId, targetId)) {
                return 'Parents and subtasks are already linked by hierarchy.';
            }

            const target = findTask(tasks, targetId);

            if (target?.predecessors?.some((predecessor) => predecessor.id === sourceId) === true) {
                return 'This dependency already exists.';
            }

            const source = findTask(tasks, sourceId);

            if (source?.predecessors?.some((predecessor) => predecessor.id === targetId) === true) {
                return 'This would create a cycle.';
            }

            return null;
        },
        [linking],
    );

    /** Drag-to-link entry: pointer-down on a bar's finish-side handle. */
    const startDragLink = useCallback(
        (task: Task, event: React.PointerEvent): void => {
            if (!canEdit || committing.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            clientPosition.current = { x: event.clientX, y: event.clientY };
            useGanttStore.getState().startLinking(task.id);
            setMode('drag');
        },
        [canEdit],
    );

    /** Context-menu entry: sticky click-to-complete mode. */
    const startClickLink = useCallback(
        (taskId: number): void => {
            if (!canEdit || committing.current) {
                return;
            }

            useGanttStore.getState().startLinking(taskId);
            setMode('click');
        },
        [canEdit],
    );

    /** Complete the link onto `target` (ignored while it is invalid). */
    const complete = useCallback(
        (target: Task): void => {
            if (linking === null || committing.current || targetError(target.id) !== null) {
                return;
            }

            committing.current = true;

            router.post(
                dependencyStore.url([projectId, target.id]),
                { predecessor_id: linking.sourceTaskId },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => {
                        committing.current = false;
                        cancel();
                    },
                },
            );
        },
        [cancel, linking, projectId, targetError],
    );

    // Track the pointer in content coordinates for the preview line, and
    // autoscroll vertically while drag-linking near the container's edges.
    useEffect(() => {
        if (linking === null) {
            return;
        }

        const element = scrollRef.current;

        if (element === null) {
            return;
        }

        const toContent = (clientX: number, clientY: number): LinkPointer => {
            const rect = element.getBoundingClientRect();

            return {
                x: clientX - rect.left + element.scrollLeft - LEFT_PANE_WIDTH,
                y: clientY - rect.top + element.scrollTop - HEADER_HEIGHT,
            };
        };

        const onPointerMove = (event: PointerEvent): void => {
            clientPosition.current = { x: event.clientX, y: event.clientY };
            setPointer(toContent(event.clientX, event.clientY));
        };

        if (clientPosition.current !== null) {
            setPointer(toContent(clientPosition.current.x, clientPosition.current.y));
        }

        let frame = 0;

        const autoscroll = (): void => {
            const position = clientPosition.current;

            if (mode === 'drag' && position !== null) {
                const rect = element.getBoundingClientRect();

                if (position.y < rect.top + HEADER_HEIGHT + AUTOSCROLL_THRESHOLD) {
                    element.scrollTop -= AUTOSCROLL_STEP;
                } else if (position.y > rect.bottom - AUTOSCROLL_THRESHOLD) {
                    element.scrollTop += AUTOSCROLL_STEP;
                }
            }

            frame = requestAnimationFrame(autoscroll);
        };

        frame = requestAnimationFrame(autoscroll);

        // Releasing a drag-link anywhere that is not a row target cancels it
        // (row targets complete first via their own pointer-up handlers, which
        // run before this document-level listener).
        const onPointerUp = (): void => {
            if (mode === 'drag' && !committing.current) {
                cancel();
            }
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);

        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };
    }, [cancel, linking, mode, scrollRef]);

    return { linking, sourceTask, mode, pointer, hoverId, setHoverId, targetError, startDragLink, startClickLink, complete, cancel };
}
