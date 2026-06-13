import { type Task } from '@/types';
import { ROW_HEIGHT } from '@/utils/gantt';
import { collectParentIds, computeLayout, expandAncestorIds, findTask, type LayoutOptions, type QuickCreateState } from '@/utils/ganttLayout';
import { describe, expect, it } from 'vitest';

let nextId = 1;

function makeTask(overrides: Partial<Task> & { children?: Task[] } = {}): Task {
    const id = overrides.id ?? nextId++;
    const level = overrides.hierarchy_level ?? 1;

    return {
        id,
        name: `Task ${id}`,
        description: null,
        parent_id: null,
        hierarchy_level: level,
        sort_order: 0,
        start_date: '2027-01-10',
        duration_days: 1,
        duration_unit: { value: 'work_days', label: 'Work days' },
        end_date: '2027-01-10',
        lock_start: false,
        lock_end: false,
        lock_duration: true,
        status: { value: 'not_started', label: 'Not started' },
        risk_level: { value: 'low', label: 'Low' },
        base_classification: { value: 'unclassified', label: 'Unclassified' },
        organization: null,
        tags: [],
        percent_complete: 0,
        created_at: null,
        updated_at: null,
        children: [],
        ...overrides,
    };
}

function child(parent: Task, overrides: Partial<Task> = {}): Task {
    return makeTask({
        parent_id: parent.id,
        hierarchy_level: parent.hierarchy_level + 1,
        ...overrides,
    });
}

const options = (overrides: Partial<LayoutOptions> = {}): LayoutOptions => ({
    zoom: 'day',
    collapsed: new Set<number>(),
    rangeStart: '2027-01-01',
    rangeEnd: '2027-03-01',
    ...overrides,
});

const quickInput = (parentId: number | null, afterId: number | null, pending: string[] = []): QuickCreateState => ({
    position: { parentId, afterId },
    pending,
    inputOpen: true,
});

describe('computeLayout quick-create splice', () => {
    it('splices the input row after the reference sibling subtree and shifts later rows', () => {
        const a = makeTask({ id: 1 });
        const aChild = child(a, { id: 2 });
        a.children = [aChild];
        const b = makeTask({ id: 3 });

        const layout = computeLayout([a, b], options({ quick: quickInput(null, 1) }));

        // Rows: A (0), A.child (1), [input] (2), B (3).
        expect(layout.quickRows).toHaveLength(1);
        expect(layout.quickRows[0].kind).toBe('input');
        expect(layout.quickRows[0].index).toBe(2);
        expect(layout.quickRows[0].top).toBe(2 * ROW_HEIGHT);
        expect(layout.quickRows[0].depth).toBe(0);
        expect(layout.rows.map((row) => row.task.id)).toEqual([1, 2, 3]);
        expect(layout.rows[2].top).toBe(3 * ROW_HEIGHT);
        expect(layout.contentHeight).toBe(4 * ROW_HEIGHT);
    });

    it('stacks pending placeholders above the input row at one anchor', () => {
        const a = makeTask({ id: 1 });
        const b = makeTask({ id: 2 });

        const layout = computeLayout([a, b], options({ quick: quickInput(null, 1, ['First', 'Second']) }));

        // Rows: A (0), [First] (1), [Second] (2), [input] (3), B (4).
        expect(layout.quickRows.map((row) => [row.kind, row.name, row.index])).toEqual([
            ['pending', 'First', 1],
            ['pending', 'Second', 2],
            ['input', null, 3],
        ]);
        expect(layout.rows[1].top).toBe(4 * ROW_HEIGHT);
        expect(layout.contentHeight).toBe(5 * ROW_HEIGHT);
    });

    it('renders pending placeholders with the input closed', () => {
        const a = makeTask({ id: 1 });

        const layout = computeLayout([a], options({ quick: { position: { parentId: null, afterId: null }, pending: ['Queued'], inputOpen: false } }));

        expect(layout.quickRows.map((row) => row.kind)).toEqual(['pending']);
        expect(layout.contentHeight).toBe(2 * ROW_HEIGHT);
    });

    it('places a parent-anchored block as the last child', () => {
        const parent = makeTask({ id: 1 });
        const first = child(parent, { id: 2 });
        const second = child(parent, { id: 3 });
        parent.children = [first, second];
        const sibling = makeTask({ id: 4 });

        const layout = computeLayout([parent, sibling], options({ quick: quickInput(1, null) }));

        // Rows: parent (0), first (1), second (2), [input] (3), sibling (4).
        expect(layout.quickRows[0].index).toBe(3);
        expect(layout.quickRows[0].depth).toBe(1);
        expect(layout.rows[3].task.id).toBe(4);
        expect(layout.rows[3].top).toBe(4 * ROW_HEIGHT);
        expect(layout.contentHeight).toBe(5 * ROW_HEIGHT);
    });

    it('places a root block with no anchors at the very end', () => {
        const a = makeTask({ id: 1 });
        const b = makeTask({ id: 2 });

        const layout = computeLayout([a, b], options({ quick: quickInput(null, null) }));

        expect(layout.quickRows[0].index).toBe(2);
        expect(layout.quickRows[0].depth).toBe(0);
        expect(layout.contentHeight).toBe(3 * ROW_HEIGHT);
    });

    it('hides the block under a collapsed parent', () => {
        const parent = makeTask({ id: 1 });
        parent.children = [child(parent, { id: 2 })];

        const layout = computeLayout([parent], options({ collapsed: new Set([1]), quick: quickInput(1, null) }));

        expect(layout.quickRows).toHaveLength(0);
        expect(layout.contentHeight).toBe(1 * ROW_HEIGHT);
    });

    it('hides the block when its tier is zoom-folded', () => {
        const root = makeTask({ id: 1 });
        const l2 = child(root, { id: 2 });
        root.children = [l2];

        // Year zoom shows two tiers; a draft at level 3 is folded away.
        const layout = computeLayout([root], options({ zoom: 'year', quick: quickInput(2, null) }));

        expect(layout.quickRows).toHaveLength(0);
    });

    it('anchors the ghost bar to the reference sibling start date', () => {
        const a = makeTask({ id: 1, start_date: '2027-01-15', end_date: '2027-01-20' });

        const layout = computeLayout([a], options({ quick: quickInput(null, 1) }));
        const expected = computeLayout([a], options()).rows[0].bar;

        // One-day ghost bar starting where the sibling starts.
        expect(layout.quickRows[0].bar).not.toBeNull();
        expect(layout.quickRows[0].bar!.x).toBe(expected!.x);
    });

    it('produces no quick rows when no block is active', () => {
        const layout = computeLayout([makeTask()], options());

        expect(layout.quickRows).toHaveLength(0);
        expect(layout.contentHeight).toBe(1 * ROW_HEIGHT);
    });
});

describe('computeLayout week zoom', () => {
    it('scales bar geometry by the week dayWidth (16px) and keeps the full hierarchy', () => {
        const root = makeTask({ id: 1, hierarchy_level: 1, start_date: '2027-01-10', end_date: '2027-01-10' });
        const l5 = makeTask({ id: 5, hierarchy_level: 5, start_date: '2027-01-10', end_date: '2027-01-10' });
        root.children = [l5];

        const layout = computeLayout([root], options({ zoom: 'week' }));

        // rangeStart 2027-01-01 → 2027-01-10 is 9 days in; 1-day bar at 16px/day.
        expect(layout.rows[0].bar).toEqual({ x: 9 * 16, width: 16 });
        // maxDepth 5 keeps the level-5 descendant visible (no zoom folding).
        expect(layout.rows).toHaveLength(2);
    });
});

describe('collectParentIds', () => {
    // Three-deep chain: 1 (L1) → 2 (L2) → 3 (L3); 3 is a leaf.
    const buildTree = (): Task[] => {
        const root = makeTask({ id: 1, hierarchy_level: 1 });
        const mid = child(root, { id: 2 });
        const leaf = child(mid, { id: 3 });
        mid.children = [leaf];
        root.children = [mid];

        return [root];
    };

    it('collects every parent by default (collapse-all)', () => {
        expect(collectParentIds(buildTree())).toEqual([1, 2]);
    });

    it('folds to a uniform level by collecting only parents at or below minLevel', () => {
        // Level 1: collapse every parent → only roots remain.
        expect(collectParentIds(buildTree(), 1)).toEqual([1, 2]);
        // Level 2: keep the root expanded, collapse its level-2 child.
        expect(collectParentIds(buildTree(), 2)).toEqual([2]);
        // Level 3: nothing left to collapse → whole tree expands.
        expect(collectParentIds(buildTree(), 3)).toEqual([]);
    });
});

describe('expandAncestorIds', () => {
    it('returns parent ids from nearest to root', () => {
        const root = makeTask({ id: 1, hierarchy_level: 1 });
        const mid = child(root, { id: 2 });
        const leaf = child(mid, { id: 3 });
        mid.children = [leaf];
        root.children = [mid];

        expect(expandAncestorIds([root], 3)).toEqual([2, 1]);
        expect(expandAncestorIds([root], 1)).toEqual([]);
        expect(expandAncestorIds([root], 99)).toEqual([]);
    });
});

describe('findTask', () => {
    it('finds tasks at any depth and returns null for misses', () => {
        const root = makeTask({ id: 1 });
        const mid = child(root, { id: 2 });
        const leaf = child(mid, { id: 3 });
        mid.children = [leaf];
        root.children = [mid];

        expect(findTask([root], 3)?.id).toBe(3);
        expect(findTask([root], 99)).toBeNull();
        expect(findTask([root], null)).toBeNull();
    });
});
