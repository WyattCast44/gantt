<?php

declare(strict_types=1);

namespace App\Support\Propagation;

use App\Support\Schedule;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;

/**
 * A whole-project schedule snapshot: every task as a {@see TaskNode}, the
 * finish-to-start dependency edges, and the project work calendar. Pure and
 * in-memory — the graph never touches the database.
 */
class ScheduleGraph
{
    /** @var array<int, TaskNode> */
    public readonly array $nodes;

    /** @var list<array{0: int, 1: int}> Edges as [predecessorId, successorId]. */
    public readonly array $edges;

    /**
     * @param  array<int, TaskNode>  $nodes  Keyed by task id.
     * @param  list<array{0: int, 1: int}>  $edges
     */
    public function __construct(array $nodes, array $edges, public readonly WorkCalendar $calendar)
    {
        // Drop edges whose endpoints are not in the node set (e.g. soft-deleted
        // tasks), then wire the child and predecessor adjacency onto the nodes.
        $edges = array_values(array_filter(
            $edges,
            fn (array $edge): bool => isset($nodes[$edge[0]], $nodes[$edge[1]]),
        ));

        foreach ($nodes as $node) {
            if ($node->parentId !== null && isset($nodes[$node->parentId])) {
                $nodes[$node->parentId]->childIds[] = $node->id;
            }
        }

        foreach ($edges as [$predecessorId, $successorId]) {
            $nodes[$successorId]->predecessorIds[] = $predecessorId;
        }

        $this->nodes = $nodes;
        $this->edges = $edges;
    }

    public function node(int $id): TaskNode
    {
        return $this->nodes[$id];
    }

    /**
     * The task and all its descendants.
     *
     * @return list<int>
     */
    public function subtreeIds(int $id): array
    {
        $ids = [$id];
        $queue = $this->nodes[$id]->childIds;

        while ($queue !== []) {
            $current = array_shift($queue);
            $ids[] = $current;
            $queue = array_merge($queue, $this->nodes[$current]->childIds);
        }

        return $ids;
    }

    /**
     * The leaf tasks of a subtree (the task itself when it has no children).
     *
     * @return list<int>
     */
    public function leavesOf(int $id): array
    {
        return array_values(array_filter(
            $this->subtreeIds($id),
            fn (int $taskId): bool => $this->nodes[$taskId]->isLeaf(),
        ));
    }

    /**
     * The ancestor chain from the task's parent up to its root.
     *
     * @return list<int>
     */
    public function ancestorsOf(int $id): array
    {
        $ancestors = [];
        $parentId = $this->nodes[$id]->parentId;

        while ($parentId !== null && isset($this->nodes[$parentId])) {
            $ancestors[] = $parentId;
            $parentId = $this->nodes[$parentId]->parentId;
        }

        return $ancestors;
    }

    /**
     * Dependency predecessors constraining a task: its own edges plus every
     * ancestor's (an edge into a parent constrains the whole subtree).
     *
     * @return list<int>
     */
    public function effectivePredecessorIds(int $id): array
    {
        $ids = $this->nodes[$id]->predecessorIds;

        foreach ($this->ancestorsOf($id) as $ancestorId) {
            $ids = array_merge($ids, $this->nodes[$ancestorId]->predecessorIds);
        }

        return array_values(array_unique($ids));
    }

    /**
     * The derived inclusive end of a node's own stored schedule.
     */
    public function nodeEnd(TaskNode $node): ?CarbonImmutable
    {
        if (! $node->start instanceof CarbonImmutable) {
            return null;
        }

        return Schedule::endDate($node->start, $node->durationDays, $node->unit, $this->calendar);
    }

    /**
     * The effective start: a leaf's own start, or the earliest start in a
     * parent's subtree (parents' stored values may be stale mid-propagation).
     */
    public function effectiveStart(int $id): ?CarbonImmutable
    {
        $node = $this->nodes[$id];

        if ($node->isLeaf()) {
            return $node->start;
        }

        $earliest = null;

        foreach ($node->childIds as $childId) {
            $childStart = $this->effectiveStart($childId);

            if ($childStart instanceof CarbonImmutable && (! $earliest instanceof CarbonImmutable || $childStart->lessThan($earliest))) {
                $earliest = $childStart;
            }
        }

        return $earliest;
    }

    /**
     * The effective end: a leaf's own derived end, or the latest end in a
     * parent's subtree.
     */
    public function effectiveEnd(int $id): ?CarbonImmutable
    {
        $node = $this->nodes[$id];

        if ($node->isLeaf()) {
            return $this->nodeEnd($node);
        }

        $latest = null;

        foreach ($node->childIds as $childId) {
            $childEnd = $this->effectiveEnd($childId);

            if ($childEnd instanceof CarbonImmutable && (! $latest instanceof CarbonImmutable || $childEnd->greaterThan($latest))) {
                $latest = $childEnd;
            }
        }

        return $latest;
    }

    /**
     * The violated finish-to-start edges in the graph's current state: the
     * successor starts on or before the predecessor's end. This is the single
     * definition of a schedule conflict (mirrored by Task::scheduleConflictIds).
     *
     * @return list<ScheduleConflict>
     */
    public function conflicts(): array
    {
        $conflicts = [];

        foreach ($this->edges as [$predecessorId, $successorId]) {
            $predecessor = $this->nodes[$predecessorId];
            $successor = $this->nodes[$successorId];

            $predecessorEnd = $this->nodeEnd($predecessor);

            if ($successor->start === null || ! $predecessorEnd instanceof CarbonImmutable) {
                continue;
            }

            if ($successor->start->lessThanOrEqualTo($predecessorEnd)) {
                $conflicts[] = new ScheduleConflict(
                    predecessorId: $predecessor->id,
                    predecessorName: $predecessor->name,
                    successorId: $successor->id,
                    successorName: $successor->name,
                    predecessorEnd: $predecessorEnd->toDateString(),
                    successorStart: $successor->start->toDateString(),
                );
            }
        }

        return $conflicts;
    }

    /**
     * Whether adding the edge (predecessor -> successor) could feed a schedule
     * change back into the predecessor — a cycle once hierarchy coupling is
     * considered. Pushing the successor moves its subtree; any moved task grows
     * its ancestors' envelopes; and any task whose end may grow pushes its own
     * dependency successors. The edge is illegal when that monotone closure
     * reaches the candidate predecessor.
     */
    public function wouldLoop(int $predecessorId, int $successorId): bool
    {
        if ($predecessorId === $successorId) {
            return true;
        }

        $startAffected = array_fill_keys($this->subtreeIds($successorId), true);
        $endAffected = [];

        $queue = array_keys($startAffected);

        while ($queue !== []) {
            $current = array_shift($queue);

            // A start-affected task's own end may move, and every ancestor's
            // envelope end may grow with it.
            foreach ([$current, ...$this->ancestorsOf($current)] as $affectedId) {
                if (isset($endAffected[$affectedId])) {
                    continue;
                }

                $endAffected[$affectedId] = true;

                // An end-affected task pushes the subtree of each dependency successor.
                foreach ($this->edges as [$edgePredecessor, $edgeSuccessor]) {
                    if ($edgePredecessor !== $affectedId) {
                        continue;
                    }

                    foreach ($this->subtreeIds($edgeSuccessor) as $pushedId) {
                        if (! isset($startAffected[$pushedId])) {
                            $startAffected[$pushedId] = true;
                            $queue[] = $pushedId;
                        }
                    }
                }
            }
        }

        return isset($endAffected[$predecessorId]);
    }
}
