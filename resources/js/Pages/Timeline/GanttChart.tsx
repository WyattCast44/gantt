import Button from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { ContextMenu, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub } from '@/components/ui/context-menu';
import DependencyLayer from '@/Pages/Timeline/Partials/DependencyLayer';
import LinkingOverlay from '@/Pages/Timeline/Partials/LinkingOverlay';
import { QuickInputRow, QuickPendingRow } from '@/Pages/Timeline/Partials/QuickCreateRow';
import RenameInput from '@/Pages/Timeline/Partials/RenameInput';
import TaskBar from '@/Pages/Timeline/Partials/TaskBar';
import TodayLine from '@/Pages/Timeline/Partials/TodayLine';
import WeekendBands from '@/Pages/Timeline/Partials/WeekendBands';
import ShortcutsHelp from '@/Pages/Timeline/Partials/ShortcutsHelp';
import TimelineSearch from '@/Pages/Timeline/Partials/TimelineSearch';
import { ToolbarButtonGroup, ToolbarGroupButton, ToolbarTooltip, toolbarSegmentClass } from '@/Pages/Timeline/Partials/ToolbarButtonGroup';
import { Tooltip } from '@/components/ui/tooltip';
import TimelineAxis from '@/Pages/Timeline/Partials/TimelineAxis';
import ZoomControl from '@/Pages/Timeline/Partials/ZoomControl';
import { useDependencyLinking } from '@/Pages/Timeline/useDependencyLinking';
import { useGanttDrag } from '@/Pages/Timeline/useGanttDrag';
import { useGanttReorder } from '@/Pages/Timeline/useGanttReorder';
import { useQuickCreate } from '@/Pages/Timeline/useQuickCreate';
import { complete as taskComplete, destroy as taskDestroy, rename as taskRename, show as taskShow } from '@/routes/projects/tasks';
import { destroy as dependencyDestroy } from '@/routes/projects/tasks/dependencies';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Task } from '@/types';
import {
    type BarMetrics,
    HEADER_HEIGHT,
    INDENT_STEP,
    LEFT_PANE_WIDTH,
    MAX_TASK_DEPTH,
    MIN_BAR_WIDTH,
    ROW_HEIGHT,
    ZOOM_CONFIG,
    type ZoomLevel,
} from '@/utils/gantt';
import { type DraftPosition, findTask } from '@/utils/ganttLayout';
import { type DragState } from '@/Pages/Timeline/useGanttDrag';
import { todayInputDate } from '@/utils/date';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { Link, router } from '@inertiajs/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * The Gantt grid: a single scroll container with a sticky two-tier axis header
 * and a sticky left task-name tree pane. Rows are virtualized (only the visible
 * window is mounted) and read their coordinates straight from the store layout,
 * keeping this component presentational.
 */
/** Distance from a horizontal edge (px) at which the calendar grows further. */
const EDGE_THRESHOLD_PX = 200;

const ZOOM_HOTKEYS: Record<string, ZoomLevel> = {
    d: 'day',
    w: 'week',
    m: 'month',
    q: 'quarter',
    y: 'year',
};

/** True when any descendant of `task` is not yet complete (drives the subtask-cascade label/payload). */
function hasIncompleteDescendants(task: Task): boolean {
    return task.children.some((child) => child.status.value !== 'complete' || hasIncompleteDescendants(child));
}

/** Apply the live drag delta to a bar so it previews where it will land. */
function previewBar(bar: BarMetrics, drag: DragState, dayWidth: number): BarMetrics {
    if (drag.mode === 'move') {
        return { x: bar.x + drag.deltaDays * dayWidth, width: bar.width };
    }

    return { x: bar.x, width: Math.max(MIN_BAR_WIDTH, bar.width + drag.deltaDays * dayWidth) };
}

export default function GanttChart({ projectId, canEdit }: { projectId: number; canEdit: boolean }) {
    const layout = useGanttStore((state) => state.layout);
    const zoom = useGanttStore((state) => state.zoom);
    const setZoom = useGanttStore((state) => state.setZoom);
    const toggleCollapse = useGanttStore((state) => state.toggleCollapse);
    const expandAll = useGanttStore((state) => state.expandAll);
    const collapseAll = useGanttStore((state) => state.collapseAll);
    const foldToLevel = useGanttStore((state) => state.foldToLevel);
    const setViewportWidth = useGanttStore((state) => state.setViewportWidth);
    const extendRangeStart = useGanttStore((state) => state.extendRangeStart);
    const extendRangeEnd = useGanttStore((state) => state.extendRangeEnd);
    const goToWeek = useGanttStore((state) => state.goToWeek);
    const focusTask = useGanttStore((state) => state.focusTask);
    const focusToken = useGanttStore((state) => state.focusToken);
    const focusRowIndex = useGanttStore((state) => state.focusRowIndex);
    const anchorToken = useGanttStore((state) => state.anchorToken);
    const anchorScroll = useGanttStore((state) => state.anchorScroll);
    const selectedTaskId = useGanttStore((state) => state.selectedTaskId);
    const selectTask = useGanttStore((state) => state.selectTask);
    const quick = useGanttStore((state) => state.quick);
    const openDraft = useGanttStore((state) => state.openDraft);
    const closeDraft = useGanttStore((state) => state.closeDraft);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pendingScrollLeft = useRef<number | null>(null);
    const extending = useRef(false);
    const panLastX = useRef<number | null>(null);
    const [panning, setPanning] = useState(false);

    const [draftValue, setDraftValue] = useState('');
    const [renaming, setRenaming] = useState<{ id: number; value: string } | null>(null);
    const [deleting, setDeleting] = useState<Task | null>(null);
    const [menu, setMenu] = useState<
        | { kind: 'task'; x: number; y: number; task: Task }
        | { kind: 'canvas'; x: number; y: number }
        | { kind: 'connector'; x: number; y: number; predecessor: { id: number; name: string }; successor: Task }
        | null
    >(null);
    const { commit: commitQuick, error: quickError, failedName, clearError } = useQuickCreate(projectId);

    const rows = layout.rows;
    const quickRows = layout.quickRows;
    const totalWidth = LEFT_PANE_WIDTH + layout.contentWidth;
    const dayWidth = ZOOM_CONFIG[zoom].dayWidth;

    // The quick-create block occupies a contiguous run of virtual indices;
    // task rows before it map 1:1, ones after it shift by the block length.
    const blockStart = quickRows.length > 0 ? quickRows[0].index : Number.POSITIVE_INFINITY;
    const virtualCount = rows.length + quickRows.length;
    const quickRowAt = (index: number) => (index >= blockStart && index < blockStart + quickRows.length ? quickRows[index - blockStart] : null);
    const taskRowAt = (index: number) => (index < blockStart ? rows[index] : rows[index - quickRows.length]);
    const virtualIndexOf = (rowIndex: number): number => (rowIndex < blockStart ? rowIndex : rowIndex + quickRows.length);

    const { drag, startMove, startResize } = useGanttDrag(projectId, canEdit, dayWidth);
    const { preview: reorderPreview, startReorder, commit: commitReorder } = useGanttReorder(projectId, canEdit, rows, scrollRef);
    const {
        linking,
        sourceTask: linkSource,
        pointer: linkPointer,
        hoverId: linkHoverId,
        setHoverId: setLinkHoverId,
        targetError: linkTargetError,
        startDragLink,
        startClickLink,
        complete: completeLink,
        cancel: cancelLink,
    } = useDependencyLinking(projectId, canEdit, scrollRef);

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 16,
    });

    // A failed quick-create reopens the input pre-filled with the failed name.
    useEffect(() => {
        if (failedName !== null) {
            setDraftValue(failedName);
        }
    }, [failedName]);

    // Keep the quick-create input visible (it can open far off-screen, e.g.
    // under a collapsed-then-expanded parent).
    const inputIndex = quickRows.find((row) => row.kind === 'input')?.index ?? null;

    useEffect(() => {
        if (inputIndex !== null) {
            virtualizer.scrollToIndex(inputIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputIndex]);

    /** Swap a task with its previous/next sibling and persist the new order. */
    const moveSibling = (row: (typeof rows)[number], delta: -1 | 1): void => {
        const ids = row.siblingIds;
        const index = ids.indexOf(row.task.id);
        const target = index + delta;

        if (target < 0 || target >= ids.length) {
            return;
        }

        const next = [...ids];
        [next[index], next[target]] = [next[target], next[index]];
        commitReorder(row.task.parent_id, next);
    };

    /** Keep the viewport centered on the same calendar date when the time scale changes. */
    const changeZoom = useCallback(
        (newZoom: ZoomLevel) => {
            if (newZoom === zoom) {
                return;
            }

            const element = scrollRef.current;

            if (element !== null) {
                const oldDayWidth = ZOOM_CONFIG[zoom].dayWidth;
                const newDayWidth = ZOOM_CONFIG[newZoom].dayWidth;
                const trackViewport = Math.max(0, element.clientWidth - LEFT_PANE_WIDTH);
                const focalDayOffset = (element.scrollLeft + trackViewport / 2) / oldDayWidth;

                pendingScrollLeft.current = focalDayOffset * newDayWidth - trackViewport / 2;
            }

            setZoom(newZoom);
        },
        [setZoom, zoom],
    );

    // Keep the calendar stretched to fill the visible bar-track width.
    useEffect(() => {
        const element = scrollRef.current;

        if (element === null) {
            return;
        }

        const update = () => setViewportWidth(Math.max(0, element.clientWidth - LEFT_PANE_WIDTH));

        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);

        return () => observer.disconnect();
    }, [setViewportWidth]);

    // Anchor the horizontal scroll to the data start on (re)init.
    useLayoutEffect(() => {
        if (scrollRef.current !== null) {
            scrollRef.current.scrollLeft = anchorScroll;
        }
    }, [anchorToken, anchorScroll]);

    // Scroll the focused task row into the vertical viewport.
    useLayoutEffect(() => {
        if (focusRowIndex !== null) {
            virtualizer.scrollToIndex(virtualIndexOf(focusRowIndex));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusToken]);

    // Re-apply scroll after a zoom change rescales the timeline width.
    useLayoutEffect(() => {
        if (pendingScrollLeft.current === null || scrollRef.current === null) {
            return;
        }

        const element = scrollRef.current;
        const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);

        element.scrollLeft = Math.min(Math.max(0, pendingScrollLeft.current), maxScroll);
        pendingScrollLeft.current = null;
    }, [zoom, layout.contentWidth]);

    // Grow the visible range as the user scrolls toward either edge so the
    // calendar feels infinite. A native listener (outside React's batching)
    // lets us flushSync the left extension and re-apply the scroll offset, so
    // shifting every coordinate right produces no visible jump.
    useEffect(() => {
        const element = scrollRef.current;

        if (element === null) {
            return;
        }

        const onScroll = (): void => {
            if (extending.current) {
                return;
            }

            const chunkDays = Math.max(30, Math.ceil(element.clientWidth / dayWidth));

            if (element.scrollLeft <= EDGE_THRESHOLD_PX) {
                extending.current = true;
                requestAnimationFrame(() => (extending.current = false));
                const addedPx = chunkDays * dayWidth;
                flushSync(() => extendRangeStart(chunkDays));
                element.scrollLeft += addedPx;
            } else if (element.scrollLeft + element.clientWidth >= element.scrollWidth - EDGE_THRESHOLD_PX) {
                extending.current = true;
                requestAnimationFrame(() => (extending.current = false));
                extendRangeEnd(chunkDays);
            }
        };

        element.addEventListener('scroll', onScroll, { passive: true });

        return () => element.removeEventListener('scroll', onScroll);
    }, [dayWidth, extendRangeStart, extendRangeEnd]);

    // Click-and-drag the axis header to pan. Incremental deltas keep panning in
    // sync even when the scroll listener extends/shifts the range mid-drag.
    useEffect(() => {
        if (!panning) {
            return;
        }

        const onMove = (event: PointerEvent): void => {
            const element = scrollRef.current;

            if (element === null || panLastX.current === null) {
                return;
            }

            element.scrollLeft -= event.clientX - panLastX.current;
            panLastX.current = event.clientX;
        };

        const onUp = (): void => setPanning(false);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [panning]);

    const startPan = (event: React.PointerEvent): void => {
        if (event.button !== 0) {
            return;
        }

        panLastX.current = event.clientX;
        setPanning(true);
    };

    /** Step the viewport by ~3/4 of a screen (the scroll listener extends edges). */
    const nudge = (direction: -1 | 1): void => {
        scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth * 0.75, behavior: 'smooth' });
    };

    const goToCurrentWeek = (): void => {
        goToWeek(todayInputDate());
    };

    const selectedIndex = selectedTaskId === null ? -1 : rows.findIndex((row) => row.task.id === selectedTaskId);
    const selectedRow = selectedIndex === -1 ? null : rows[selectedIndex];

    /** Move the selection through visible rows, keeping it on-screen. */
    const moveSelection = (delta: -1 | 1): void => {
        if (rows.length === 0) {
            return;
        }

        const next = selectedIndex === -1 ? (delta === 1 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, selectedIndex + delta));

        selectTask(rows[next].task.id);
        virtualizer.scrollToIndex(virtualIndexOf(next));
    };

    /** Open the quick-create input at a tree position with a clean slate. */
    const openDraftAt = (position: DraftPosition): void => {
        clearError();
        setDraftValue('');
        openDraft(position);
    };

    const cancelDraft = (): void => {
        closeDraft();
        setDraftValue('');
        clearError();
    };

    /** New task after the selection, or at the end of the roots (N). */
    const openNewTaskDraft = (): void => {
        openDraftAt(
            selectedRow !== null ? { parentId: selectedRow.task.parent_id, afterId: selectedRow.task.id } : { parentId: null, afterId: null },
        );
    };

    /** New subtask of the selection (Shift+N), capped at the max depth. */
    const openSubtaskDraft = (): void => {
        if (selectedRow !== null && selectedRow.task.hierarchy_level < MAX_TASK_DEPTH) {
            openDraftAt({ parentId: selectedRow.task.id, afterId: null });
        }
    };

    /**
     * Tab/Shift+Tab on the draft: indent re-anchors it as the last child of
     * the row its block follows (same flat position, one level deeper);
     * outdent makes it the sibling directly after its current parent.
     */
    const indentDraft = (delta: 1 | -1): void => {
        const state = useGanttStore.getState();

        if (state.quick === null) {
            return;
        }

        const { parentId, afterId } = state.quick.position;

        if (delta === 1) {
            const anchor =
                afterId !== null
                    ? findTask(state.tasks, afterId)
                    : parentId !== null
                      ? (findTask(state.tasks, parentId)?.children.at(-1) ?? null)
                      : (state.tasks.at(-1) ?? null);

            if (anchor === null || anchor.hierarchy_level >= MAX_TASK_DEPTH) {
                return;
            }

            openDraft({ parentId: anchor.id, afterId: null });

            return;
        }

        if (parentId === null) {
            return;
        }

        const parent = findTask(state.tasks, parentId);

        if (parent !== null) {
            openDraft({ parentId: parent.parent_id, afterId: parent.id });
        }
    };

    const startRename = (task: Task): void => {
        setRenaming({ id: task.id, value: task.name });
    };

    const commitRename = (): void => {
        if (renaming === null) {
            return;
        }

        const name = renaming.value.trim();
        const current = findTask(useGanttStore.getState().tasks, renaming.id);

        if (name === '' || current === null || name === current.name) {
            setRenaming(null);

            return;
        }

        router.patch(
            taskRename.url([projectId, renaming.id]),
            { name },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setRenaming(null),
            },
        );
    };

    const confirmDelete = (): void => {
        if (deleting === null) {
            return;
        }

        router.delete(taskDestroy.url([projectId, deleting.id]), {
            data: { from: 'timeline' },
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setDeleting(null),
        });
    };

    const removeDependency = (successorId: number, predecessorId: number): void => {
        router.delete(dependencyDestroy.url([projectId, successorId, predecessorId]), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const markComplete = (task: Task, includeSubtasks: boolean): void => {
        router.post(
            taskComplete.url([projectId, task.id]),
            { include_subtasks: includeSubtasks },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.metaKey || event.ctrlKey || event.altKey || deleting !== null) {
                return;
            }

            const target = event.target;

            if (target instanceof Element && target.closest('[contenteditable="true"], input, textarea, select')) {
                return;
            }

            const key = event.key.toLowerCase();

            if (!event.shiftKey) {
                const level = ZOOM_HOTKEYS[key];

                if (level !== undefined) {
                    event.preventDefault();
                    changeZoom(level);

                    return;
                }

                if (key === 't') {
                    event.preventDefault();
                    goToWeek(todayInputDate());

                    return;
                }

                if (key >= '1' && key <= String(MAX_TASK_DEPTH)) {
                    event.preventDefault();
                    foldToLevel(Number(key));

                    return;
                }

                if (key === 'e') {
                    event.preventDefault();
                    expandAll();

                    return;
                }

                if (key === 'c') {
                    event.preventDefault();
                    collapseAll();

                    return;
                }
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    moveSelection(1);

                    return;
                case 'ArrowUp':
                    event.preventDefault();
                    moveSelection(-1);

                    return;
                case 'ArrowLeft':
                    if (selectedRow !== null) {
                        event.preventDefault();

                        if (selectedRow.expandable && !selectedRow.collapsed) {
                            toggleCollapse(selectedRow.task.id);
                        }
                    }

                    return;
                case 'ArrowRight':
                    if (selectedRow !== null) {
                        event.preventDefault();

                        if (selectedRow.expandable && selectedRow.collapsed) {
                            toggleCollapse(selectedRow.task.id);
                        }
                    }

                    return;
                case 'Enter':
                    if (selectedRow !== null) {
                        event.preventDefault();
                        router.visit(taskShow.url([projectId, selectedRow.task.id]));
                    }

                    return;
                case 'Escape':
                    if (linking !== null) {
                        cancelLink();
                    } else if (quick !== null) {
                        cancelDraft();
                    } else if (renaming !== null) {
                        setRenaming(null);
                    } else {
                        selectTask(null);
                    }

                    return;
                case 'Delete':
                case 'Backspace':
                    if (canEdit && selectedRow !== null) {
                        event.preventDefault();
                        setDeleting(selectedRow.task);
                    }

                    return;
                case 'F2':
                    if (canEdit && selectedRow !== null) {
                        event.preventDefault();
                        startRename(selectedRow.task);
                    }

                    return;
            }

            if (canEdit && key === 'n') {
                event.preventDefault();

                if (event.shiftKey) {
                    openSubtaskDraft();
                } else {
                    openNewTaskDraft();
                }
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    });

    return (
        <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-2.5 dark:border-border-dark">
                <div className="flex items-center gap-3">
                    <ShortcutsHelp canEdit={canEdit} />
                    {canEdit && (
                        <Tooltip label="Add a task below the selection — or press N">
                            <Button
                                size="sm"
                                onClick={openNewTaskDraft}
                                data-testid="toolbar-new-task"
                                className="h-8 py-0"
                            >
                                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                                New task
                            </Button>
                        </Tooltip>
                    )}
                    <ToolbarButtonGroup aria-label="Task tree">
                        <ToolbarTooltip label="Expand all tasks">
                            <ToolbarGroupButton onClick={expandAll} className={toolbarSegmentClass(false)}>
                                Expand all
                            </ToolbarGroupButton>
                        </ToolbarTooltip>
                        <ToolbarTooltip label="Collapse all tasks">
                            <ToolbarGroupButton onClick={collapseAll} className={toolbarSegmentClass(true)}>
                                Collapse all
                            </ToolbarGroupButton>
                        </ToolbarTooltip>
                    </ToolbarButtonGroup>
                </div>
                <div className="flex items-center gap-3">
                    <ToolbarButtonGroup aria-label="Timeline navigation">
                        <ToolbarTooltip label="Scroll backward">
                            <ToolbarGroupButton
                                onClick={() => nudge(-1)}
                                aria-label="Scroll back"
                                className={toolbarSegmentClass(false, 'px-2')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </ToolbarGroupButton>
                        </ToolbarTooltip>
                        <ToolbarTooltip label="Go to current week (T)">
                            <ToolbarGroupButton
                                onClick={goToCurrentWeek}
                                aria-label="Go to current week"
                                className={toolbarSegmentClass(false)}
                            >
                                Today
                            </ToolbarGroupButton>
                        </ToolbarTooltip>
                        <ToolbarTooltip label="Scroll forward">
                            <ToolbarGroupButton
                                onClick={() => nudge(1)}
                                aria-label="Scroll forward"
                                className={toolbarSegmentClass(true, 'px-2')}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </ToolbarGroupButton>
                        </ToolbarTooltip>
                    </ToolbarButtonGroup>
                    <ZoomControl zoom={zoom} onChange={changeZoom} />
                </div>
            </div>

            {linking !== null && (
                <div
                    data-testid="linking-hint"
                    className="flex shrink-0 items-center justify-between gap-3 border-b border-accent-200 bg-accent-50 px-6 py-2 text-sm text-accent-800 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-200"
                >
                    <span>
                        Linking <strong>{linkSource?.name ?? 'task'}</strong> — click the task that should come after it.
                    </span>
                    <button type="button" onClick={cancelLink} className={cn('shrink-0 text-xs underline', focusRingNeutral)}>
                        Cancel (Esc)
                    </button>
                </div>
            )}

            <div
                ref={scrollRef}
                data-testid="gantt-scroll"
                tabIndex={0}
                role="grid"
                aria-label="Gantt timeline"
                aria-activedescendant={selectedTaskId !== null ? `gantt-row-${selectedTaskId}` : undefined}
                className="scrollbar-gutter-stable relative min-h-0 flex-1 overflow-auto focus:outline-none"
            >
                {/* Sticky three-tier header: corner + adaptive time axis. */}
                <div className="sticky top-0 z-20 flex" style={{ width: totalWidth }}>
                    <div
                        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-1.5 border-r border-b border-border bg-neutral-50 px-3 dark:border-border-dark dark:bg-neutral-900"
                        style={{ width: LEFT_PANE_WIDTH, height: HEADER_HEIGHT }}
                    >
                        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">Task</span>
                        <TimelineSearch />
                    </div>
                    <div
                        onPointerDown={startPan}
                        className={cn('shrink-0 select-none', panning ? 'cursor-grabbing' : 'cursor-grab')}
                        title="Drag to pan the timeline"
                    >
                        <TimelineAxis rangeStart={layout.rangeStart} rangeEnd={layout.rangeEnd} zoom={zoom} width={layout.contentWidth} />
                    </div>
                </div>

                {/* Virtualized rows: sticky-left tree cell + bar track. */}
                <div
                    className="relative"
                    style={{ width: totalWidth, height: virtualizer.getTotalSize() }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        setMenu({ kind: 'canvas', x: event.clientX, y: event.clientY });
                    }}
                >
                    {/* Weekend shading sits over the bar track, behind the bars. */}
                    <div className="absolute top-0" style={{ left: LEFT_PANE_WIDTH }}>
                        <WeekendBands rangeStart={layout.rangeStart} rangeEnd={layout.rangeEnd} zoom={zoom} height={layout.contentHeight} />
                    </div>

                    {/* Drop indicator while dragging a row to reorder. */}
                    {reorderPreview !== null && (
                        <div
                            className="pointer-events-none absolute left-0 z-30 h-0.5 bg-accent-500"
                            style={{ top: reorderPreview.dropTop, width: LEFT_PANE_WIDTH }}
                            aria-hidden
                        />
                    )}

                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const quickRow = quickRowAt(virtualRow.index);

                        if (quickRow !== null) {
                            return (
                                <div
                                    key={quickRow.kind === 'input' ? 'quick-input' : `quick-pending-${virtualRow.index}`}
                                    className="absolute left-0 flex"
                                    style={{ top: virtualRow.start, width: totalWidth, height: ROW_HEIGHT }}
                                >
                                    {quickRow.kind === 'pending' ? (
                                        <QuickPendingRow
                                            name={quickRow.name ?? ''}
                                            depth={quickRow.depth}
                                            bar={quickRow.bar}
                                            contentWidth={layout.contentWidth}
                                        />
                                    ) : (
                                        <QuickInputRow
                                            depth={quickRow.depth}
                                            bar={quickRow.bar}
                                            contentWidth={layout.contentWidth}
                                            value={draftValue}
                                            error={quickError}
                                            onChange={setDraftValue}
                                            onCommit={(name) => {
                                                commitQuick(name);
                                                setDraftValue('');
                                            }}
                                            onCancel={cancelDraft}
                                            onIndent={indentDraft}
                                        />
                                    )}
                                </div>
                            );
                        }

                        const row = taskRowAt(virtualRow.index);
                        const isSelected = row.task.id === selectedTaskId;
                        const isLinkTarget = linking !== null && linkHoverId === row.task.id;
                        const linkError = isLinkTarget ? linkTargetError(row.task.id) : null;

                        return (
                            <div
                                key={row.task.id}
                                id={`gantt-row-${row.task.id}`}
                                role="row"
                                aria-selected={isSelected}
                                title={linkError ?? undefined}
                                // While linking, a click only completes the link —
                                // suppress navigation/collapse/reorder underneath.
                                onClickCapture={
                                    linking !== null
                                        ? (event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                          }
                                        : undefined
                                }
                                onClick={() => selectTask(row.task.id)}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    selectTask(row.task.id);
                                    setMenu({ kind: 'task', x: event.clientX, y: event.clientY, task: row.task });
                                }}
                                onPointerEnter={linking !== null ? () => setLinkHoverId(row.task.id) : undefined}
                                onPointerLeave={linking !== null ? () => setLinkHoverId(null) : undefined}
                                onPointerUp={linking !== null ? () => completeLink(row.task) : undefined}
                                className={cn(
                                    'absolute left-0 flex',
                                    linking !== null && (linkError !== null ? 'cursor-not-allowed' : 'cursor-crosshair'),
                                )}
                                style={{ top: virtualRow.start, width: totalWidth, height: ROW_HEIGHT }}
                            >
                                <div
                                    className={cn(
                                        'group sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-b border-border pr-1 dark:border-border-dark',
                                        isLinkTarget
                                            ? linkError !== null
                                                ? 'bg-red-50 dark:bg-red-950'
                                                : 'bg-accent-100 dark:bg-accent-900'
                                            : isSelected
                                              ? 'bg-accent-50 dark:bg-accent-950'
                                              : 'bg-white dark:bg-neutral-950',
                                        reorderPreview?.taskId === row.task.id && 'opacity-50',
                                    )}
                                    style={{ width: LEFT_PANE_WIDTH, height: ROW_HEIGHT, paddingLeft: 8 + row.depth * INDENT_STEP }}
                                >
                                    {canEdit && row.siblingIds.length > 1 ? (
                                        <button
                                            type="button"
                                            onPointerDown={(event) => startReorder(row.task, row.siblingIds, event)}
                                            aria-label="Drag to reorder"
                                            className={cn(
                                                'shrink-0 cursor-grab touch-none rounded-sm p-0.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 focus:opacity-100 dark:text-neutral-600 dark:hover:text-neutral-300',
                                                focusRingNeutral,
                                            )}
                                        >
                                            <GripVertical className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <span className="inline-block w-1 shrink-0" aria-hidden />
                                    )}
                                    {row.expandable ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleCollapse(row.task.id)}
                                            aria-label={row.collapsed ? 'Expand' : 'Collapse'}
                                            className={cn('shrink-0 rounded-sm p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200', focusRingNeutral)}
                                        >
                                            {row.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    ) : (
                                        <span className="inline-block w-5 shrink-0" aria-hidden />
                                    )}
                                    {renaming?.id === row.task.id ? (
                                        <RenameInput
                                            value={renaming.value}
                                            onChange={(value) => setRenaming({ id: row.task.id, value })}
                                            onCommit={commitRename}
                                            onCancel={() => setRenaming(null)}
                                        />
                                    ) : (
                                        <Link
                                            href={taskShow.url([projectId, row.task.id])}
                                            className={cn('min-w-0 flex-1 truncate rounded-sm text-sm text-slate-700 hover:text-accent-600 dark:text-neutral-200 dark:hover:text-accent-400', focusRingNeutral)}
                                        >
                                            {row.task.name}
                                        </Link>
                                    )}

                                    {canEdit && row.siblingIds.length > 1 && (
                                        <span className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => moveSibling(row, -1)}
                                                disabled={row.siblingIds[0] === row.task.id}
                                                aria-label="Move up"
                                                className={cn('rounded-sm p-0.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-neutral-200', focusRingNeutral)}
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveSibling(row, 1)}
                                                disabled={row.siblingIds[row.siblingIds.length - 1] === row.task.id}
                                                aria-label="Move down"
                                                className={cn('rounded-sm p-0.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-neutral-200', focusRingNeutral)}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                        </span>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        'group/track relative border-b border-border/60 dark:border-border-dark/60',
                                        isLinkTarget
                                            ? linkError !== null
                                                ? 'bg-red-50/60 dark:bg-red-500/10'
                                                : 'bg-accent-100/60 dark:bg-accent-500/15'
                                            : isSelected && 'bg-accent-50/40 dark:bg-accent-500/5',
                                    )}
                                    style={{ width: layout.contentWidth, height: ROW_HEIGHT }}
                                >
                                    {row.bar !== null &&
                                        (() => {
                                            const isDragging = drag?.taskId === row.task.id;
                                            const displayBar = isDragging && drag !== null ? previewBar(row.bar, drag, dayWidth) : row.bar;

                                            return (
                                                <TaskBar
                                                    task={row.task}
                                                    bar={displayBar}
                                                    // Parents are engine-derived envelopes of their
                                                    // children — only leaf bars can be dragged.
                                                    interactive={canEdit && row.task.children.length === 0}
                                                    dragging={isDragging}
                                                    onMoveStart={(event) => startMove(row.task, event)}
                                                    onResizeStart={(event) => startResize(row.task, event)}
                                                />
                                            );
                                        })()}

                                    {/* Finish-side connector handle: drag it onto another task to add a dependency. */}
                                    {canEdit && row.bar !== null && linking === null && drag === null && (
                                        <button
                                            type="button"
                                            data-testid={`link-handle-${row.task.id}`}
                                            aria-label={`Link "${row.task.name}" to a successor`}
                                            onPointerDown={(event) => startDragLink(row.task, event)}
                                            onClick={(event) => event.stopPropagation()}
                                            className="absolute z-10 h-3 w-3 -translate-y-1/2 cursor-crosshair touch-none rounded-full border-2 border-accent-500 bg-white opacity-0 transition-opacity group-hover/track:opacity-100 hover:scale-125 focus:opacity-100 dark:bg-neutral-900"
                                            style={{ left: row.bar.x + row.bar.width + 2, top: ROW_HEIGHT / 2 }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div
                        className="pointer-events-none absolute top-0 z-[5]"
                        style={{ left: LEFT_PANE_WIDTH, width: layout.contentWidth, height: layout.contentHeight }}
                    >
                        <TodayLine rangeStart={layout.rangeStart} rangeEnd={layout.rangeEnd} zoom={zoom} height={layout.contentHeight} />
                    </div>

                    {/* Dependency connectors draw above the rows so their hit
                        paths stay clickable; everything else in the layer is
                        pointer-transparent. The sticky left pane (z-10) still
                        covers them when horizontally scrolled. */}
                    <div
                        className="pointer-events-none absolute top-0 z-[6]"
                        style={{ left: LEFT_PANE_WIDTH, width: layout.contentWidth, height: layout.contentHeight }}
                    >
                        <DependencyLayer
                            rows={rows}
                            width={layout.contentWidth}
                            height={layout.contentHeight}
                            interactive={canEdit && linking === null}
                            onConnectorMenu={(event, target) => {
                                event.preventDefault();
                                setMenu({
                                    kind: 'connector',
                                    x: event.clientX,
                                    y: event.clientY,
                                    predecessor: target.predecessor,
                                    successor: target.successor,
                                });
                            }}
                        />
                        {linking !== null && (
                            <LinkingOverlay
                                rows={rows}
                                sourceTaskId={linking.sourceTaskId}
                                pointer={linkPointer}
                                width={layout.contentWidth}
                                height={layout.contentHeight}
                            />
                        )}
                    </div>
                </div>

                {/* Empty chart: point straight at quick-create (sticky so it
                    stays centered in the viewport, not the scrollable canvas). */}
                {rows.length === 0 && quickRows.length === 0 && (
                    <div data-testid="timeline-empty" className="sticky left-0 flex w-full flex-col items-center gap-3 px-6 py-16 text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">No tasks yet.</p>
                        {canEdit ? (
                            <>
                                <p className="max-w-sm text-sm text-slate-500 dark:text-neutral-400">
                                    Type a name, press <kbd className="rounded border border-slate-200 bg-slate-100/90 px-1 font-sans text-[10px] font-medium text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">↵</kbd>,
                                    and keep going — tasks land right on the timeline.
                                </p>
                                <Button size="sm" onClick={openNewTaskDraft}>
                                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                                    New task
                                </Button>
                            </>
                        ) : (
                            <p className="max-w-sm text-sm text-slate-500 dark:text-neutral-400">
                                Tasks will appear here once they are added.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {menu?.kind === 'task' && (
                <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} aria-label="Task actions">
                    {canEdit && (
                        <>
                            <ContextMenuItem
                                shortcut="N"
                                onSelect={() => openDraftAt({ parentId: menu.task.parent_id, afterId: menu.task.id })}
                            >
                                New task below
                            </ContextMenuItem>
                            <ContextMenuItem
                                shortcut="⇧N"
                                disabled={menu.task.hierarchy_level >= MAX_TASK_DEPTH}
                                disabledReason={`Tasks may not be nested more than ${MAX_TASK_DEPTH} levels deep.`}
                                onSelect={() => openDraftAt({ parentId: menu.task.id, afterId: null })}
                            >
                                New subtask
                            </ContextMenuItem>
                            <ContextMenuItem shortcut="F2" onSelect={() => startRename(menu.task)}>
                                Rename
                            </ContextMenuItem>
                            <ContextMenuItem
                                disabled={menu.task.status.value === 'complete' && !hasIncompleteDescendants(menu.task)}
                                disabledReason="This task is already complete."
                                onSelect={() => markComplete(menu.task, hasIncompleteDescendants(menu.task))}
                            >
                                {hasIncompleteDescendants(menu.task) ? 'Mark complete with subtasks' : 'Mark complete'}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onSelect={() => startClickLink(menu.task.id)}>Link to successor…</ContextMenuItem>
                            <ContextMenuSub label="Dependencies">
                                {(menu.task.predecessors ?? []).length === 0 ? (
                                    <ContextMenuLabel>No dependencies</ContextMenuLabel>
                                ) : (
                                    (menu.task.predecessors ?? []).map((predecessor) => (
                                        <ContextMenuItem
                                            key={predecessor.id}
                                            destructive
                                            onSelect={() => removeDependency(menu.task.id, predecessor.id)}
                                        >
                                            Remove “{predecessor.name}”
                                        </ContextMenuItem>
                                    ))
                                )}
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem onSelect={() => focusTask(menu.task.id)}>Show in timeline</ContextMenuItem>
                    <ContextMenuItem shortcut="↵" onSelect={() => router.visit(taskShow.url([projectId, menu.task.id]))}>
                        Open details
                    </ContextMenuItem>
                    {canEdit && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem shortcut="⌫" destructive onSelect={() => setDeleting(menu.task)}>
                                Delete…
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenu>
            )}

            {menu?.kind === 'canvas' && (
                <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} aria-label="Timeline actions">
                    {canEdit && (
                        <>
                            <ContextMenuItem shortcut="N" onSelect={() => openDraftAt({ parentId: null, afterId: null })}>
                                New task
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem onSelect={expandAll}>Expand all</ContextMenuItem>
                    <ContextMenuItem onSelect={collapseAll}>Collapse all</ContextMenuItem>
                    <ContextMenuItem shortcut="T" onSelect={goToCurrentWeek}>
                        Go to today
                    </ContextMenuItem>
                </ContextMenu>
            )}

            {menu?.kind === 'connector' && (
                <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} aria-label="Dependency actions">
                    <ContextMenuLabel>
                        {menu.predecessor.name} → {menu.successor.name}
                    </ContextMenuLabel>
                    {canEdit && (
                        <ContextMenuItem destructive onSelect={() => removeDependency(menu.successor.id, menu.predecessor.id)}>
                            Remove dependency
                        </ContextMenuItem>
                    )}
                </ContextMenu>
            )}

            <ConfirmDialog
                open={deleting !== null}
                title="Delete task?"
                description={
                    deleting !== null && deleting.children.length > 0
                        ? `"${deleting.name}" and all of its subtasks will be deleted.`
                        : `"${deleting?.name}" will be deleted.`
                }
                confirmLabel="Delete"
                destructive
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
}
