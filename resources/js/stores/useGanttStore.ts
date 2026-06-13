/**
 * Deterministic Gantt viewport store (A11). Holds the task tree plus viewport
 * state (zoom, collapse map, visible range) and recomputes the layout — the
 * flat visible-row list and pixel coordinates — eagerly inside each action,
 * i.e. outside the React render loop. Components read the precomputed `layout`
 * via memoized selectors and stay purely presentational.
 *
 * The visible date range is extendable: it starts padded around the data and
 * grows as the user scrolls toward either edge, so the calendar feels infinite
 * in both directions. The layout is the single source of truth for bar
 * positions, so future date propagation can mutate it through the same engine.
 */

import { type Task } from '@/types';
import { addDays, barMetrics, dayOffset, endOfWeek, focusScrollLeft, inclusiveDaySpan, parseDay, startOfWeek, ZOOM_LEVELS, type ZoomLevel, ZOOM_CONFIG, zoomToFitSpan } from '@/utils/gantt';
import {
    collectParentIds,
    computeLayout,
    computeRange,
    type DraftPosition,
    expandAncestorIds,
    findTask,
    type GanttLayout,
    type QuickCreateState,
    reorderTree,
} from '@/utils/ganttLayout';
import { create } from 'zustand';

type GanttInit = {
    tasks: Task[];
    projectStart: string | null;
    projectEnd: string | null;
};

type GanttState = {
    tasks: Task[];
    zoom: ZoomLevel;
    collapsed: Set<number>;
    projectStart: string | null;
    projectEnd: string | null;
    /** Visible bar-track width in px; the calendar is stretched to fill it. */
    viewportWidth: number;
    /** Extendable visible date window (YYYY-MM-DD). */
    rangeStart: string;
    rangeEnd: string;
    /** Bumped on (re)init so the view scrolls to `anchorScroll`. */
    anchorToken: number;
    /** Initial scrollLeft (px) that places the data start at the left edge. */
    anchorScroll: number;
    /** Bumped when focusTask scrolls a row into view vertically. */
    focusToken: number;
    focusRowIndex: number | null;
    /** The keyboard/click row selection (hotkeys act on this task). */
    selectedTaskId: number | null;
    /** Active quick-create block (pending placeholders + input row), or null. */
    quick: QuickCreateState | null;
    /** Active dependency-linking mode: the predecessor awaiting a successor. */
    linking: { sourceTaskId: number } | null;
    layout: GanttLayout;

    init: (args: GanttInit) => void;
    setTasks: (tasks: Task[]) => void;
    setZoom: (zoom: ZoomLevel) => void;
    setViewportWidth: (viewportWidth: number) => void;
    extendRangeStart: (days: number) => void;
    extendRangeEnd: (days: number) => void;
    /** Scroll the viewport to the week containing `iso` (Monday–Sunday). */
    goToWeek: (iso: string) => void;
    /** Reveal a task in the tree and frame its bar in the viewport. */
    focusTask: (taskId: number) => void;
    /** Optimistically reorder a sibling group (parentId null = roots). */
    reorderSiblings: (parentId: number | null, orderedIds: number[]) => void;
    toggleCollapse: (id: number) => void;
    expandAll: () => void;
    collapseAll: () => void;
    /** Fold the tree to a uniform depth: show levels 1..`level`, collapse deeper. */
    foldToLevel: (level: number) => void;
    selectTask: (id: number | null) => void;
    /**
     * Open the quick-create input at a tree position, auto-expanding a
     * collapsed parent and zooming in if the draft's tier is zoom-folded.
     */
    openDraft: (position: DraftPosition) => void;
    /** Freeze a committed name into a pending placeholder (input stays open to chain). */
    commitDraft: (name: string) => void;
    /** Close the input row; the block survives while creates are in flight. */
    closeDraft: () => void;
    /** Drop the oldest pending placeholder (its create round-tripped). */
    confirmCreated: () => void;
    /** Drop every pending placeholder (a create failed; the queue stops). */
    clearPending: () => void;
    startLinking: (sourceTaskId: number) => void;
    stopLinking: () => void;
};

/**
 * Days of calendar kept beyond the data extent on each side (scroll headroom).
 * Sized so the initial anchored scroll sits clear of the edge-extend threshold
 * even at the coarsest (year) zoom, where one day is a single pixel.
 */
const PAD_DAYS = 260;

const EMPTY_LAYOUT: GanttLayout = {
    rows: [],
    rangeStart: '',
    rangeEnd: '',
    contentWidth: 0,
    contentHeight: 0,
    quickRows: [],
};

/** YYYY-MM-DD compares lexicographically == chronologically. */
const earlier = (a: string, b: string): string => (a <= b ? a : b);
const later = (a: string, b: string): string => (a >= b ? a : b);

/** Extend the end so the range spans at least the visible viewport width. */
function fillToViewport(start: string, end: string, zoom: ZoomLevel, viewportWidth: number): string {
    const minDays = Math.ceil(viewportWidth / ZOOM_CONFIG[zoom].dayWidth);

    return minDays > inclusiveDaySpan(start, end) ? addDays(start, minDays - 1) : end;
}

/** Recompute the layout for the current range + viewport state. */
function layoutFor(state: Pick<GanttState, 'tasks' | 'zoom' | 'collapsed' | 'rangeStart' | 'rangeEnd' | 'quick'>): GanttLayout {
    return computeLayout(state.tasks, {
        zoom: state.zoom,
        collapsed: state.collapsed,
        rangeStart: state.rangeStart,
        rangeEnd: state.rangeEnd,
        quick: state.quick,
    });
}

/** The hierarchy level a draft at this position would occupy (1 = root). */
function draftLevel(tasks: Task[], position: DraftPosition): number {
    const parent = findTask(tasks, position.parentId);

    if (parent !== null) {
        return parent.hierarchy_level + 1;
    }

    return findTask(tasks, position.afterId)?.hierarchy_level ?? 1;
}

export const useGanttStore = create<GanttState>((set, get) => ({
    tasks: [],
    zoom: 'month',
    collapsed: new Set<number>(),
    projectStart: null,
    projectEnd: null,
    viewportWidth: 0,
    rangeStart: '',
    rangeEnd: '',
    anchorToken: 0,
    anchorScroll: 0,
    focusToken: 0,
    focusRowIndex: null,
    selectedTaskId: null,
    quick: null,
    linking: null,
    layout: EMPTY_LAYOUT,

    init: ({ tasks, projectStart, projectEnd }) => {
        // Fresh view per project: reset expansion, re-pad the range around the
        // data, and anchor the scroll so the data start sits at the left edge.
        const { zoom, viewportWidth } = get();
        const data = computeRange(tasks, projectStart, projectEnd);
        const collapsed = new Set<number>();
        const rangeStart = addDays(data.start, -PAD_DAYS);
        const rangeEnd = fillToViewport(rangeStart, addDays(data.end, PAD_DAYS), zoom, viewportWidth);

        set({
            tasks,
            projectStart,
            projectEnd,
            collapsed,
            rangeStart,
            rangeEnd,
            anchorToken: get().anchorToken + 1,
            anchorScroll: PAD_DAYS * ZOOM_CONFIG[zoom].dayWidth,
            selectedTaskId: null,
            quick: null,
            linking: null,
            layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick: null }),
        });
    },

    setTasks: (tasks) => {
        // Keep the current window but never let it stop covering the data
        // (e.g. after a drag pushes a task past the edge).
        const { zoom, collapsed, projectStart, projectEnd, viewportWidth } = get();
        const data = computeRange(tasks, projectStart, projectEnd);
        const rangeStart = earlier(get().rangeStart, data.start);
        const rangeEnd = fillToViewport(rangeStart, later(get().rangeEnd, data.end), zoom, viewportWidth);

        // Reconcile transient state against the new tree: a quick block whose
        // parent vanished closes, one whose sibling reference vanished
        // re-anchors to the end of its group, and a vanished linking source
        // exits link mode.
        let quick = get().quick;

        if (quick !== null && quick.position.parentId !== null && findTask(tasks, quick.position.parentId) === null) {
            quick = null;
        } else if (quick !== null && quick.position.afterId !== null && findTask(tasks, quick.position.afterId) === null) {
            quick = { ...quick, position: { parentId: quick.position.parentId, afterId: null } };
        }

        // Absorb a landed quick-create: when the task at the block's anchor
        // slot now matches the oldest pending name, that create has round-
        // tripped — drop its placeholder and advance the anchor past it so the
        // block stays below the rows it produced. Creates are serialized, so
        // at most one can land per refresh.
        if (quick !== null && quick.pending.length > 0) {
            const { parentId, afterId } = quick.position;
            const group = parentId === null ? tasks : (findTask(tasks, parentId)?.children ?? []);
            const created = afterId === null ? group[group.length - 1] : group[group.findIndex((task) => task.id === afterId) + 1];

            if (created !== undefined && created.name === quick.pending[0]) {
                quick = {
                    ...quick,
                    pending: quick.pending.slice(1),
                    position: { parentId, afterId: created.id },
                };

                if (quick.pending.length === 0 && !quick.inputOpen) {
                    quick = null;
                }
            }
        }

        const linking = get().linking !== null && findTask(tasks, get().linking!.sourceTaskId) === null ? null : get().linking;

        const layout = layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick });

        // A selection whose task vanished moves to the nearest surviving row.
        let selectedTaskId = get().selectedTaskId;

        if (selectedTaskId !== null && findTask(tasks, selectedTaskId) === null) {
            const previousIndex = get().layout.rows.findIndex((row) => row.task.id === selectedTaskId);
            const fallback = layout.rows[Math.min(Math.max(previousIndex, 0), layout.rows.length - 1)];

            selectedTaskId = fallback?.task.id ?? null;
        }

        set({ tasks, rangeStart, rangeEnd, quick, linking, selectedTaskId, layout });
    },

    setZoom: (zoom) => {
        const { tasks, collapsed, rangeStart, viewportWidth, quick } = get();
        const rangeEnd = fillToViewport(rangeStart, get().rangeEnd, zoom, viewportWidth);

        set({ zoom, rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }) });
    },

    setViewportWidth: (viewportWidth) => {
        if (viewportWidth === get().viewportWidth) {
            return;
        }

        const { tasks, zoom, collapsed, rangeStart, quick } = get();
        const rangeEnd = fillToViewport(rangeStart, get().rangeEnd, zoom, viewportWidth);

        set({ viewportWidth, rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }) });
    },

    extendRangeStart: (days) => {
        const { tasks, zoom, collapsed, rangeEnd, quick } = get();
        const rangeStart = addDays(get().rangeStart, -days);

        set({ rangeStart, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }) });
    },

    extendRangeEnd: (days) => {
        const { tasks, zoom, collapsed, rangeStart, quick } = get();
        const rangeEnd = addDays(get().rangeEnd, days);

        set({ rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }) });
    },

    goToWeek: (iso) => {
        const { tasks, zoom, collapsed, viewportWidth } = get();
        const weekStart = startOfWeek(iso);
        const weekEnd = endOfWeek(iso);

        let rangeStart = get().rangeStart;
        let rangeEnd = get().rangeEnd;

        if (rangeStart === '' || weekStart < rangeStart) {
            rangeStart = addDays(weekStart, -PAD_DAYS);
        }

        if (rangeEnd === '' || weekEnd > rangeEnd) {
            rangeEnd = later(rangeEnd || weekEnd, fillToViewport(rangeStart, addDays(weekEnd, PAD_DAYS), zoom, viewportWidth));
        }

        const anchorScroll = dayOffset(parseDay(weekStart), parseDay(rangeStart)) * ZOOM_CONFIG[zoom].dayWidth;

        set({
            rangeStart,
            rangeEnd,
            anchorToken: get().anchorToken + 1,
            anchorScroll,
            layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick: get().quick }),
        });
    },

    focusTask: (taskId) => {
        const state = get();
        const task = findTask(state.tasks, taskId);

        if (task === null) {
            return;
        }

        const collapsed = new Set(state.collapsed);

        for (const id of expandAncestorIds(state.tasks, taskId)) {
            collapsed.delete(id);
        }

        const { tasks, viewportWidth, quick } = state;
        let zoom = state.zoom;

        if (task.hierarchy_level > ZOOM_CONFIG[zoom].maxDepth) {
            zoom = [...ZOOM_LEVELS].reverse().find((candidate) => ZOOM_CONFIG[candidate].maxDepth >= task.hierarchy_level) ?? 'day';
        }

        let rangeStart = state.rangeStart;
        let rangeEnd = state.rangeEnd;
        let anchorScroll = state.anchorScroll;
        let anchorToken = state.anchorToken;

        if (task.start_date === null) {
            const layout = layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick });
            const rowIndex = layout.rows.findIndex((row) => row.task.id === taskId);

            set({
                collapsed,
                zoom,
                selectedTaskId: taskId,
                focusRowIndex: rowIndex === -1 ? null : rowIndex,
                focusToken: state.focusToken + 1,
                layout,
            });

            return;
        }

        const taskEnd = task.end_date ?? task.start_date;
        zoom = zoomToFitSpan(inclusiveDaySpan(task.start_date, taskEnd), viewportWidth, task.hierarchy_level);

        if (rangeStart === '' || task.start_date < rangeStart) {
            rangeStart = addDays(task.start_date, -PAD_DAYS);
        }

        if (rangeEnd === '' || taskEnd > rangeEnd) {
            rangeEnd = later(rangeEnd || taskEnd, fillToViewport(rangeStart, addDays(taskEnd, PAD_DAYS), zoom, viewportWidth));
        } else {
            rangeEnd = fillToViewport(rangeStart, rangeEnd, zoom, viewportWidth);
        }

        const bar = barMetrics(task.start_date, taskEnd, rangeStart, zoom);

        if (bar !== null) {
            anchorScroll = focusScrollLeft(bar.x, bar.width, viewportWidth);
            anchorToken += 1;
        }

        const layout = layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick });
        const rowIndex = layout.rows.findIndex((row) => row.task.id === taskId);

        set({
            collapsed,
            zoom,
            rangeStart,
            rangeEnd,
            anchorScroll,
            anchorToken,
            selectedTaskId: taskId,
            focusRowIndex: rowIndex === -1 ? null : rowIndex,
            focusToken: state.focusToken + 1,
            layout,
        });
    },

    reorderSiblings: (parentId, orderedIds) => {
        const { zoom, collapsed, rangeStart, rangeEnd, quick } = get();
        const tasks = reorderTree(get().tasks, parentId, orderedIds);

        set({ tasks, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }) });
    },

    toggleCollapse: (id) => {
        const collapsed = new Set(get().collapsed);
        collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);

        set({ collapsed, layout: layoutFor({ ...get(), collapsed }) });
    },

    expandAll: () => {
        const collapsed = new Set<number>();
        set({ collapsed, layout: layoutFor({ ...get(), collapsed }) });
    },

    collapseAll: () => {
        const collapsed = new Set(collectParentIds(get().tasks));
        set({ collapsed, layout: layoutFor({ ...get(), collapsed }) });
    },

    foldToLevel: (level) => {
        // Collapse every parent at level >= `level` so only levels 1..`level`
        // remain visible; level 1 collapses everything, the deepest level
        // (nothing left to collapse) expands the whole tree.
        const collapsed = new Set(collectParentIds(get().tasks, level));
        set({ collapsed, layout: layoutFor({ ...get(), collapsed }) });
    },

    selectTask: (id) => {
        if (id !== get().selectedTaskId) {
            set({ selectedTaskId: id });
        }
    },

    openDraft: (position) => {
        const { tasks, viewportWidth } = get();
        let { zoom, collapsed } = get();

        // A draft under a collapsed parent would be invisible — expand it.
        if (position.parentId !== null && collapsed.has(position.parentId)) {
            collapsed = new Set(collapsed);
            collapsed.delete(position.parentId);
        }

        // If the draft's tier is folded at this zoom, step in to the nearest
        // zoom level that shows it (coarsest first, so the view changes least).
        const level = draftLevel(tasks, position);

        if (level > ZOOM_CONFIG[zoom].maxDepth) {
            zoom = [...ZOOM_LEVELS].reverse().find((candidate) => ZOOM_CONFIG[candidate].maxDepth >= level) ?? 'day';
        }

        const rangeStart = get().rangeStart;
        const rangeEnd = fillToViewport(rangeStart, get().rangeEnd, zoom, viewportWidth);

        // Re-anchoring carries any in-flight pending placeholders along.
        const quick: QuickCreateState = { position, pending: get().quick?.pending ?? [], inputOpen: true };

        set({
            quick,
            collapsed,
            zoom,
            rangeEnd,
            linking: null,
            layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd, quick }),
        });
    },

    commitDraft: (name) => {
        const current = get().quick;

        if (current === null) {
            return;
        }

        const quick: QuickCreateState = { ...current, pending: [...current.pending, name], inputOpen: true };

        set({ quick, layout: layoutFor({ ...get(), quick }) });
    },

    closeDraft: () => {
        const current = get().quick;

        if (current === null) {
            return;
        }

        // The block survives while creates are still round-tripping.
        const quick = current.pending.length === 0 ? null : { ...current, inputOpen: false };

        set({ quick, layout: layoutFor({ ...get(), quick }) });
    },

    confirmCreated: () => {
        const current = get().quick;

        if (current === null) {
            return;
        }

        const pending = current.pending.slice(1);
        const quick = pending.length === 0 && !current.inputOpen ? null : { ...current, pending };

        set({ quick, layout: layoutFor({ ...get(), quick }) });
    },

    clearPending: () => {
        const current = get().quick;

        if (current === null || current.pending.length === 0) {
            return;
        }

        const quick = current.inputOpen ? { ...current, pending: [] } : null;

        set({ quick, layout: layoutFor({ ...get(), quick }) });
    },

    startLinking: (sourceTaskId) => {
        // One transient mode at a time: linking closes the quick-create input
        // (pending placeholders stay until their creates land).
        const current = get().quick;
        const quick = current === null ? null : current.pending.length === 0 ? null : { ...current, inputOpen: false };

        set({
            linking: { sourceTaskId },
            quick,
            layout: current === quick ? get().layout : layoutFor({ ...get(), quick }),
        });
    },

    stopLinking: () => {
        if (get().linking !== null) {
            set({ linking: null });
        }
    },
}));
