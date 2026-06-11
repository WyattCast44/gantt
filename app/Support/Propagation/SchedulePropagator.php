<?php

declare(strict_types=1);

namespace App\Support\Propagation;

use App\Enums\DurationUnit;
use App\Support\Schedule;
use Carbon\CarbonImmutable;
use LogicException;

/**
 * The push-only finish-to-start propagation algorithm (PRD §4, Phase 8).
 *
 * Dependency edges are evaluated at leaf level: an edge into a parent
 * constrains every leaf of its subtree, and a predecessor contributes its
 * subtree envelope end. Leaves are processed once, in topological order, so a
 * single pass terminates. A violated leaf slides to the earliest valid start
 * (duration preserved) unless its locks pin it — locked tasks never move;
 * the violated edge simply remains a conflict in the result. A deadline task
 * (end-only lock) compresses its duration against the fixed end instead of
 * sliding. Moving a predecessor earlier never pulls successors back: existing
 * slack always survives. Parents are then recomputed bottom-up as the envelope
 * of their subtree.
 */
class SchedulePropagator
{
    /**
     * Run propagation, mutating the graph's nodes in place, and return the
     * changeset plus the conflicts present in the resulting schedule.
     */
    public static function propagate(ScheduleGraph $graph): PropagationResult
    {
        $original = [];

        foreach ($graph->nodes as $id => $node) {
            $original[$id] = [$node->start?->toDateString(), $node->durationDays, $node->unit];
        }

        /** @var array<int, array{string, ?int}> $reasons reason + caused-by id per moved leaf */
        $reasons = [];

        self::pushLeaves($graph, $reasons);
        self::rollUpParents($graph);

        $moves = [];
        $ids = array_keys($graph->nodes);
        sort($ids);

        foreach ($ids as $id) {
            $node = $graph->nodes[$id];
            [$fromStart, $fromDuration, $fromUnit] = $original[$id];

            if ($fromStart === $node->start?->toDateString()
                && $fromDuration === $node->durationDays
                && $fromUnit === $node->unit) {
                continue;
            }

            [$reason, $causedById] = $reasons[$id] ?? [TaskMove::REASON_ROLLUP, null];

            $moves[$id] = new TaskMove(
                taskId: $id,
                name: $node->name,
                reason: $reason,
                fromStart: $fromStart,
                toStart: $node->start?->toDateString(),
                fromDuration: $fromDuration,
                toDuration: $node->durationDays,
                fromUnit: $fromUnit->value,
                toUnit: $node->unit->value,
                causedByTaskId: $causedById,
                causedByName: $causedById === null ? null : $graph->nodes[$causedById]->name,
            );
        }

        return new PropagationResult($moves, $graph->conflicts());
    }

    /**
     * Process every leaf once in topological order over the leaf-expanded
     * dependency edges, sliding (or compressing) the violated movable ones.
     *
     * @param  array<int, array{string, ?int}>  $reasons
     */
    private static function pushLeaves(ScheduleGraph $graph, array &$reasons): void
    {
        [$successorsOf, $inDegree] = self::leafDag($graph);

        $queue = array_keys(array_filter($inDegree, fn (int $degree): bool => $degree === 0));
        sort($queue);

        $processed = 0;

        while ($queue !== []) {
            $leafId = array_shift($queue);
            $processed++;

            self::applyConstraint($graph, $leafId, $reasons);

            foreach ($successorsOf[$leafId] ?? [] as $successorId) {
                if (--$inDegree[$successorId] === 0) {
                    $queue[] = $successorId;
                    sort($queue);
                }
            }
        }

        if ($processed < count($inDegree)) {
            throw new LogicException('The dependency graph contains a cycle; propagation cannot run.');
        }
    }

    /**
     * Expand dependency edges to leaf level: every leaf under a predecessor
     * precedes every leaf under its successor.
     *
     * @return array{array<int, list<int>>, array<int, int>}
     */
    private static function leafDag(ScheduleGraph $graph): array
    {
        $successorsOf = [];
        $inDegree = [];

        foreach ($graph->nodes as $id => $node) {
            if ($node->isLeaf()) {
                $inDegree[$id] = 0;
            }
        }

        foreach ($graph->edges as [$predecessorId, $successorId]) {
            foreach ($graph->leavesOf($predecessorId) as $fromLeaf) {
                foreach ($graph->leavesOf($successorId) as $toLeaf) {
                    if ($fromLeaf === $toLeaf) {
                        throw new LogicException(
                            'A dependency edge links a task to its own subtree; propagation cannot run.',
                        );
                    }

                    $successorsOf[$fromLeaf][] = $toLeaf;
                    $inDegree[$toLeaf]++;
                }
            }
        }

        return [$successorsOf, $inDegree];
    }

    /**
     * Evaluate one leaf's finish-to-start constraint and move it if violated
     * and movable.
     *
     * @param  array<int, array{string, ?int}>  $reasons
     */
    private static function applyConstraint(ScheduleGraph $graph, int $leafId, array &$reasons): void
    {
        $node = $graph->node($leafId);

        if (! $node->start instanceof CarbonImmutable) {
            return;
        }

        $requiredStart = null;
        $causedById = null;

        foreach ($graph->effectivePredecessorIds($leafId) as $predecessorId) {
            $predecessorEnd = $graph->effectiveEnd($predecessorId);

            if (! $predecessorEnd instanceof CarbonImmutable) {
                continue;
            }

            $candidate = Schedule::nextStartAfter($predecessorEnd, $node->unit, $graph->calendar);

            if (! $requiredStart instanceof CarbonImmutable || $candidate->greaterThan($requiredStart)) {
                $requiredStart = $candidate;
                $causedById = $predecessorId;
            }
        }

        // No constraint, or already satisfied (push-only: never pull earlier).
        if (! $requiredStart instanceof CarbonImmutable || $node->start->greaterThanOrEqualTo($requiredStart)) {
            return;
        }

        // A pinned start never moves; the violated edge surfaces as a conflict.
        if ($node->startIsPinned()) {
            return;
        }

        if ($node->isDeadline()) {
            $currentEnd = $graph->nodeEnd($node);
            $newDuration = $currentEnd instanceof CarbonImmutable
                ? Schedule::durationBetween($requiredStart, $currentEnd, $node->unit, $graph->calendar)
                : null;

            // The deadline cannot absorb the push — leave it as a conflict.
            if ($newDuration === null || $newDuration < 1) {
                return;
            }

            $node->start = $requiredStart;
            $node->durationDays = $newDuration;
            $reasons[$leafId] = [TaskMove::REASON_DEADLINE_COMPRESSION, $causedById];

            return;
        }

        $node->start = $requiredStart;
        $reasons[$leafId] = [TaskMove::REASON_DEPENDENCY_PUSH, $causedById];
    }

    /**
     * Recompute every parent as its subtree envelope, deepest first. A parent
     * whose envelope cannot be expressed exactly in its own duration unit
     * falls back to calendar days so the derived end always equals the
     * envelope end. Parents with fully unscheduled subtrees become unscheduled.
     */
    private static function rollUpParents(ScheduleGraph $graph): void
    {
        $parents = [];

        foreach ($graph->nodes as $id => $node) {
            if (! $node->isLeaf()) {
                $parents[$id] = count($graph->ancestorsOf($id));
            }
        }

        arsort($parents);

        foreach (array_keys($parents) as $id) {
            $node = $graph->node($id);
            $envelopeStart = $graph->effectiveStart($id);

            if (! $envelopeStart instanceof CarbonImmutable) {
                $node->start = null;

                continue;
            }

            $envelopeEnd = $graph->effectiveEnd($id);
            $duration = Schedule::durationBetween($envelopeStart, $envelopeEnd, $node->unit, $graph->calendar);

            if ($duration === null
                || ! Schedule::endDate($envelopeStart, $duration, $node->unit, $graph->calendar)->equalTo($envelopeEnd)) {
                $duration = (int) $envelopeStart->diffInDays($envelopeEnd) + 1;
                $node->unit = DurationUnit::CalendarDays;
            }

            $node->start = $envelopeStart;
            $node->durationDays = $duration;
        }
    }
}
