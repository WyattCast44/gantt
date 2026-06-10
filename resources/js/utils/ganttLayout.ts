/**
 * Pure Gantt layout engine. Given the nested task tree plus a viewport
 * (zoom + collapse map), it deterministically computes the flat visible-row
 * list and each row's integer-pixel coordinates (A11). Kept free of React and
 * Zustand so it is trivially unit-testable and so future date propagation can
 * drive bar positions through the same functions.
 */

import { type Task } from '@/types';
import { barMetrics, type BarMetrics, ROW_HEIGHT, timelineWidth, ZOOM_CONFIG, type ZoomLevel } from './gantt';

export type GanttRow = {
    readonly task: Task;
    /** Zero-based indentation depth (hierarchy_level - 1). */
    readonly depth: number;
    /** Top edge in integer pixels (row index * ROW_HEIGHT). */
    readonly top: number;
    /** Bar position, or null when the task has no start date. */
    readonly bar: BarMetrics | null;
    /** Has children that would be visible at this zoom (so it shows a chevron). */
    readonly expandable: boolean;
    /** Whether this node is currently collapsed. */
    readonly collapsed: boolean;
    /** Ordered ids of this row's sibling group (drives reordering). */
    readonly siblingIds: number[];
};

export type GanttLayout = {
    readonly rows: GanttRow[];
    readonly rangeStart: string;
    readonly rangeEnd: string;
    readonly contentWidth: number;
    readonly contentHeight: number;
};

/** YYYY-MM-DD compares lexicographically == chronologically. */
function earlier(a: string, b: string): string {
    return a <= b ? a : b;
}

function later(a: string, b: string): string {
    return a >= b ? a : b;
}

/**
 * The timeline's date span: the project's range unioned with the extent of any
 * tasks that fall outside it, so every bar is reachable. Falls back to a
 * single-day window anchored on today when nothing has dates.
 */
export function computeRange(
    roots: Task[],
    projectStart: string | null,
    projectEnd: string | null,
): { start: string; end: string } {
    let start = projectStart;
    let end = projectEnd;

    const visit = (task: Task): void => {
        if (task.start_date !== null) {
            start = start === null ? task.start_date : earlier(start, task.start_date);
        }

        const taskEnd = task.end_date ?? task.start_date;
        if (taskEnd !== null) {
            end = end === null ? taskEnd : later(end, taskEnd);
        }

        task.children.forEach(visit);
    };

    roots.forEach(visit);

    const today = new Date().toISOString().slice(0, 10);
    start ??= end ?? today;
    end ??= start;

    return { start, end: later(start, end) };
}

export type LayoutOptions = {
    readonly zoom: ZoomLevel;
    readonly collapsed: ReadonlySet<number>;
    readonly rangeStart: string;
    readonly rangeEnd: string;
};

/**
 * Flatten the nested tree into the visible-row list, pruning collapsed subtrees
 * and folding hierarchy levels deeper than the current zoom allows (slippy-map
 * level of detail, FR-15), and stamp each row's pixel coordinates.
 */
export function computeLayout(roots: Task[], options: LayoutOptions): GanttLayout {
    const { zoom, collapsed, rangeStart, rangeEnd } = options;
    const maxDepth = ZOOM_CONFIG[zoom].maxDepth;
    const rows: GanttRow[] = [];

    const walk = (task: Task, siblingIds: number[]): void => {
        // Zoom fold: deeper tiers disappear when zoomed out.
        if (task.hierarchy_level > maxDepth) {
            return;
        }

        const childrenVisibleAtZoom = task.children.length > 0 && task.hierarchy_level + 1 <= maxDepth;
        const isCollapsed = collapsed.has(task.id);

        rows.push({
            task,
            depth: task.hierarchy_level - 1,
            top: rows.length * ROW_HEIGHT,
            bar: barMetrics(task.start_date, task.end_date, rangeStart, zoom),
            expandable: childrenVisibleAtZoom,
            collapsed: isCollapsed,
            siblingIds,
        });

        if (childrenVisibleAtZoom && !isCollapsed) {
            const childIds = task.children.map((child) => child.id);
            task.children.forEach((child) => walk(child, childIds));
        }
    };

    const rootIds = roots.map((root) => root.id);
    roots.forEach((root) => walk(root, rootIds));

    return {
        rows,
        rangeStart,
        rangeEnd,
        contentWidth: timelineWidth(rangeStart, rangeEnd, zoom),
        contentHeight: rows.length * ROW_HEIGHT,
    };
}

/**
 * Return a new tree with one sibling group reordered to match `orderedIds`.
 * `parentId === null` reorders the roots; otherwise it reorders that parent's
 * children. Pure — used for the optimistic reorder before the server confirms.
 */
export function reorderTree(roots: Task[], parentId: number | null, orderedIds: number[]): Task[] {
    const sortByOrder = (siblings: Task[]): Task[] => {
        const byId = new Map(siblings.map((task) => [task.id, task]));

        return orderedIds.map((id) => byId.get(id)).filter((task): task is Task => task !== undefined);
    };

    if (parentId === null) {
        return sortByOrder(roots);
    }

    const visit = (task: Task): Task => {
        if (task.id === parentId) {
            return { ...task, children: sortByOrder(task.children) };
        }

        return task.children.length === 0 ? task : { ...task, children: task.children.map(visit) };
    };

    return roots.map(visit);
}

/** Collect the ids of every task that has children (for collapse-all). */
export function collectParentIds(roots: Task[]): number[] {
    const ids: number[] = [];

    const visit = (task: Task): void => {
        if (task.children.length > 0) {
            ids.push(task.id);
        }
        task.children.forEach(visit);
    };

    roots.forEach(visit);

    return ids;
}
