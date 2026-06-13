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

/** Where the quick-create block is anchored in the tree. */
export type DraftPosition = {
    /** Parent of the new task(s) (null = root group). */
    readonly parentId: number | null;
    /** Sibling whose subtree the block follows (null = end of the group). */
    readonly afterId: number | null;
};

/**
 * The transient quick-create state: committed names awaiting the server
 * (rendered as pending placeholder rows) plus, below them, the open input row.
 * The whole block shares one tree anchor — Enter-chaining always opens the
 * next draft directly beneath the row it just committed.
 */
export type QuickCreateState = {
    readonly position: DraftPosition;
    /** Names committed and awaiting server confirmation, oldest first. */
    readonly pending: readonly string[];
    /** Whether the editable input row is open below the pending stack. */
    readonly inputOpen: boolean;
};

/**
 * One synthetic quick-create row, spliced into the flat layout at the block's
 * tree position so row tops, content height, and the virtualizer count account
 * for it like any other row.
 */
export type QuickRow = {
    readonly kind: 'pending' | 'input';
    /** The committed name (pending rows only). */
    readonly name: string | null;
    /** Flat row index the row occupies (for the virtualizer). */
    readonly index: number;
    readonly top: number;
    /** Zero-based indentation depth. */
    readonly depth: number;
    /** Ghost bar at the smart-default dates (context anchor, 1 day). */
    readonly bar: BarMetrics | null;
};

export type GanttLayout = {
    readonly rows: GanttRow[];
    readonly rangeStart: string;
    readonly rangeEnd: string;
    readonly contentWidth: number;
    readonly contentHeight: number;
    /** Contiguous quick-create block (pending placeholders + input row). */
    readonly quickRows: QuickRow[];
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
    readonly quick?: QuickCreateState | null;
};

/**
 * Flatten the nested tree into the visible-row list, pruning collapsed subtrees
 * and folding hierarchy levels deeper than the current zoom allows (slippy-map
 * level of detail, FR-15), and stamp each row's pixel coordinates. An active
 * quick-create block (pending placeholders + input row) is spliced in at its
 * tree position (after its reference sibling's subtree, else at the end of its
 * group) so every later row shifts down accordingly.
 */
export function computeLayout(roots: Task[], options: LayoutOptions): GanttLayout {
    const { zoom, collapsed, rangeStart, rangeEnd } = options;
    const quick = options.quick ?? null;
    const quickSize = quick === null ? 0 : quick.pending.length + (quick.inputOpen ? 1 : 0);
    const maxDepth = ZOOM_CONFIG[zoom].maxDepth;
    const rows: GanttRow[] = [];
    const quickRows: QuickRow[] = [];

    // The ghost bars mirror the server's smart default: the reference
    // sibling's start, else the parent's, else today, for one day.
    const quickAnchor =
        quick === null
            ? null
            : (findTask(roots, quick.position.afterId)?.start_date ??
              findTask(roots, quick.position.parentId)?.start_date ??
              new Date().toISOString().slice(0, 10));

    /** Rows already emitted (tasks + quick block), = the next flat index. */
    const slotIndex = (): number => rows.length + quickRows.length;

    const placeQuickBlock = (depth: number): void => {
        if (quick === null || quickSize === 0 || quickRows.length > 0) {
            return;
        }

        const bar = barMetrics(quickAnchor, quickAnchor, rangeStart, zoom);

        for (const name of quick.pending) {
            const index = slotIndex();
            quickRows.push({ kind: 'pending', name, index, top: index * ROW_HEIGHT, depth, bar });
        }

        if (quick.inputOpen) {
            const index = slotIndex();
            quickRows.push({ kind: 'input', name: null, index, top: index * ROW_HEIGHT, depth, bar });
        }
    };

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
            top: slotIndex() * ROW_HEIGHT,
            bar: barMetrics(task.start_date, task.end_date, rangeStart, zoom),
            expandable: childrenVisibleAtZoom,
            collapsed: isCollapsed,
            siblingIds,
        });

        if (childrenVisibleAtZoom && !isCollapsed) {
            const childIds = task.children.map((child) => child.id);
            task.children.forEach((child) => walk(child, childIds));
        }

        // A block anchored as this task's last child (visible only while the
        // parent is expanded and its tier isn't zoom-folded).
        if (
            quick?.position.parentId === task.id &&
            quick.position.afterId === null &&
            !isCollapsed &&
            task.hierarchy_level + 1 <= maxDepth
        ) {
            placeQuickBlock(task.hierarchy_level);
        }

        // A block anchored as the sibling following this task's subtree.
        if (quick?.position.afterId === task.id) {
            placeQuickBlock(task.hierarchy_level - 1);
        }
    };

    const rootIds = roots.map((root) => root.id);
    roots.forEach((root) => walk(root, rootIds));

    // A block at the end of the root group.
    if (quick !== null && quick.position.parentId === null && quick.position.afterId === null) {
        placeQuickBlock(0);
    }

    return {
        rows,
        rangeStart,
        rangeEnd,
        contentWidth: timelineWidth(rangeStart, rangeEnd, zoom),
        contentHeight: slotIndex() * ROW_HEIGHT,
        quickRows,
    };
}

/** Depth-first search for a task anywhere in the tree (null id = no match). */
export function findTask(roots: Task[], id: number | null): Task | null {
    if (id === null) {
        return null;
    }

    for (const task of roots) {
        if (task.id === id) {
            return task;
        }

        const found = findTask(task.children, id);

        if (found !== null) {
            return found;
        }
    }

    return null;
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

/**
 * Collect the ids of every task that has children (for collapse-all). Pass
 * `minLevel` to collect only parents at or below that hierarchy depth, which
 * folds the tree to a uniform level: collapsing every parent at level >= N
 * leaves levels 1..N visible.
 */
export function collectParentIds(roots: Task[], minLevel = 0): number[] {
    const ids: number[] = [];

    const visit = (task: Task): void => {
        if (task.children.length > 0 && task.hierarchy_level >= minLevel) {
            ids.push(task.id);
        }
        task.children.forEach(visit);
    };

    roots.forEach(visit);

    return ids;
}
