import Button from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import DependencyLayer from '@/Pages/Timeline/Partials/DependencyLayer';
import TaskBar from '@/Pages/Timeline/Partials/TaskBar';
import TodayLine from '@/Pages/Timeline/Partials/TodayLine';
import WeekendBands from '@/Pages/Timeline/Partials/WeekendBands';
import TimelineAxis from '@/Pages/Timeline/Partials/TimelineAxis';
import ZoomControl from '@/Pages/Timeline/Partials/ZoomControl';
import { useGanttDrag } from '@/Pages/Timeline/useGanttDrag';
import { useGanttReorder } from '@/Pages/Timeline/useGanttReorder';
import { show as taskShow } from '@/routes/projects/tasks';
import { useGanttStore } from '@/stores/useGanttStore';
import { type BarMetrics, HEADER_HEIGHT, INDENT_STEP, LEFT_PANE_WIDTH, MIN_BAR_WIDTH, ROW_HEIGHT, ZOOM_CONFIG, type ZoomLevel } from '@/utils/gantt';
import { type DragState } from '@/Pages/Timeline/useGanttDrag';
import { todayInputDate } from '@/utils/date';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { Link } from '@inertiajs/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical } from 'lucide-react';
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
    m: 'month',
    q: 'quarter',
    y: 'year',
};

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
    const setViewportWidth = useGanttStore((state) => state.setViewportWidth);
    const extendRangeStart = useGanttStore((state) => state.extendRangeStart);
    const extendRangeEnd = useGanttStore((state) => state.extendRangeEnd);
    const goToWeek = useGanttStore((state) => state.goToWeek);
    const anchorToken = useGanttStore((state) => state.anchorToken);
    const anchorScroll = useGanttStore((state) => state.anchorScroll);

    const scrollRef = useRef<HTMLDivElement>(null);
    const pendingScrollLeft = useRef<number | null>(null);
    const extending = useRef(false);
    const panLastX = useRef<number | null>(null);
    const [panning, setPanning] = useState(false);

    const rows = layout.rows;
    const totalWidth = LEFT_PANE_WIDTH + layout.contentWidth;
    const dayWidth = ZOOM_CONFIG[zoom].dayWidth;

    const { drag, startMove, startResize } = useGanttDrag(projectId, canEdit, dayWidth);
    const { preview: reorderPreview, startReorder, commit: commitReorder } = useGanttReorder(projectId, canEdit, rows, scrollRef);

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

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target;

            if (target instanceof Element && target.closest('[contenteditable="true"], input, textarea, select')) {
                return;
            }

            const key = event.key.toLowerCase();
            const level = ZOOM_HOTKEYS[key];

            if (level !== undefined) {
                event.preventDefault();
                changeZoom(level);

                return;
            }

            if (key === 't') {
                event.preventDefault();
                goToWeek(todayInputDate());
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [changeZoom, goToWeek]);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 16,
    });

    return (
        <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-3 dark:border-border-dark">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Tooltip label="Scroll backward">
                            <Button variant="secondary" size="icon" onClick={() => nudge(-1)} aria-label="Scroll back">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip label="Go to current week (T)">
                            <Button variant="secondary" size="sm" onClick={goToCurrentWeek} aria-label="Go to current week">
                                Today
                            </Button>
                        </Tooltip>
                        <Tooltip label="Scroll forward">
                            <Button variant="secondary" size="icon" onClick={() => nudge(1)} aria-label="Scroll forward">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    </div>
                    <Tooltip label="Expand all tasks">
                        <Button variant="secondary" size="sm" onClick={expandAll}>
                            Expand all
                        </Button>
                    </Tooltip>
                    <Tooltip label="Collapse all tasks">
                        <Button variant="secondary" size="sm" onClick={collapseAll}>
                            Collapse all
                        </Button>
                    </Tooltip>
                </div>
                <ZoomControl zoom={zoom} onChange={changeZoom} />
            </div>

            <div ref={scrollRef} data-testid="gantt-scroll" className="relative min-h-0 flex-1 overflow-auto">
                {/* Sticky three-tier header: corner + adaptive time axis. */}
                <div className="sticky top-0 z-20 flex" style={{ width: totalWidth }}>
                    <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-b border-border bg-neutral-50 px-3 dark:border-border-dark dark:bg-neutral-900"
                        style={{ width: LEFT_PANE_WIDTH, height: HEADER_HEIGHT }}
                    >
                        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">Task</span>
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
                <div className="relative" style={{ width: totalWidth, height: virtualizer.getTotalSize() }}>
                    {/* Weekend shading + dependency connectors sit over the bar track, behind the bars. */}
                    <div className="absolute top-0" style={{ left: LEFT_PANE_WIDTH }}>
                        <WeekendBands rangeStart={layout.rangeStart} rangeEnd={layout.rangeEnd} zoom={zoom} height={layout.contentHeight} />
                        <DependencyLayer rows={rows} width={layout.contentWidth} height={layout.contentHeight} />
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
                        const row = rows[virtualRow.index];

                        return (
                            <div
                                key={row.task.id}
                                className="absolute left-0 flex"
                                style={{ top: virtualRow.start, width: totalWidth, height: ROW_HEIGHT }}
                            >
                                <div
                                    className={cn(
                                        'group sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-b border-border bg-white pr-1 dark:border-border-dark dark:bg-neutral-950',
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
                                    <Link
                                        href={taskShow.url([projectId, row.task.id])}
                                        className={cn('min-w-0 flex-1 truncate rounded-sm text-sm text-slate-700 hover:text-accent-600 dark:text-neutral-200 dark:hover:text-accent-400', focusRingNeutral)}
                                    >
                                        {row.task.name}
                                    </Link>

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

                                <div className="relative border-b border-border/60 dark:border-border-dark/60" style={{ width: layout.contentWidth, height: ROW_HEIGHT }}>
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
                </div>
            </div>
        </div>
    );
}
