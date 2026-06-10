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
import { addDays, dayOffset, endOfWeek, inclusiveDaySpan, parseDay, startOfWeek, type ZoomLevel, ZOOM_CONFIG } from '@/utils/gantt';
import { collectParentIds, computeLayout, computeRange, type GanttLayout, reorderTree } from '@/utils/ganttLayout';
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
    layout: GanttLayout;

    init: (args: GanttInit) => void;
    setTasks: (tasks: Task[]) => void;
    setZoom: (zoom: ZoomLevel) => void;
    setViewportWidth: (viewportWidth: number) => void;
    extendRangeStart: (days: number) => void;
    extendRangeEnd: (days: number) => void;
    /** Scroll the viewport to the week containing `iso` (Monday–Sunday). */
    goToWeek: (iso: string) => void;
    /** Optimistically reorder a sibling group (parentId null = roots). */
    reorderSiblings: (parentId: number | null, orderedIds: number[]) => void;
    toggleCollapse: (id: number) => void;
    expandAll: () => void;
    collapseAll: () => void;
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
function layoutFor(state: Pick<GanttState, 'tasks' | 'zoom' | 'collapsed' | 'rangeStart' | 'rangeEnd'>): GanttLayout {
    return computeLayout(state.tasks, {
        zoom: state.zoom,
        collapsed: state.collapsed,
        rangeStart: state.rangeStart,
        rangeEnd: state.rangeEnd,
    });
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
            layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }),
        });
    },

    setTasks: (tasks) => {
        // Keep the current window but never let it stop covering the data
        // (e.g. after a drag pushes a task past the edge).
        const { zoom, collapsed, projectStart, projectEnd, viewportWidth } = get();
        const data = computeRange(tasks, projectStart, projectEnd);
        const rangeStart = earlier(get().rangeStart, data.start);
        const rangeEnd = fillToViewport(rangeStart, later(get().rangeEnd, data.end), zoom, viewportWidth);

        set({ tasks, rangeStart, rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
    },

    setZoom: (zoom) => {
        const { tasks, collapsed, rangeStart, viewportWidth } = get();
        const rangeEnd = fillToViewport(rangeStart, get().rangeEnd, zoom, viewportWidth);

        set({ zoom, rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
    },

    setViewportWidth: (viewportWidth) => {
        if (viewportWidth === get().viewportWidth) {
            return;
        }

        const { tasks, zoom, collapsed, rangeStart } = get();
        const rangeEnd = fillToViewport(rangeStart, get().rangeEnd, zoom, viewportWidth);

        set({ viewportWidth, rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
    },

    extendRangeStart: (days) => {
        const { tasks, zoom, collapsed, rangeEnd } = get();
        const rangeStart = addDays(get().rangeStart, -days);

        set({ rangeStart, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
    },

    extendRangeEnd: (days) => {
        const { tasks, zoom, collapsed, rangeStart } = get();
        const rangeEnd = addDays(get().rangeEnd, days);

        set({ rangeEnd, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
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
            layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }),
        });
    },

    reorderSiblings: (parentId, orderedIds) => {
        const { zoom, collapsed, rangeStart, rangeEnd } = get();
        const tasks = reorderTree(get().tasks, parentId, orderedIds);

        set({ tasks, layout: layoutFor({ tasks, zoom, collapsed, rangeStart, rangeEnd }) });
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
}));
