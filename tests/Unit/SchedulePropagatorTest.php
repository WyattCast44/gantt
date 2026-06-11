<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Support\Propagation\ScheduleGraph;
use App\Support\Propagation\SchedulePropagator;
use App\Support\Propagation\TaskMove;
use App\Support\Propagation\TaskNode;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;

/**
 * Build a TaskNode quickly. Defaults: root leaf, calendar days, only the
 * duration locked (the freely-sliding default).
 */
function node(int $id, ?string $start, int $duration = 1, array $options = []): TaskNode
{
    return new TaskNode(
        id: $id,
        parentId: $options['parent'] ?? null,
        name: $options['name'] ?? "Task {$id}",
        start: $start === null ? null : CarbonImmutable::parse($start),
        durationDays: $duration,
        unit: $options['unit'] ?? DurationUnit::CalendarDays,
        lockStart: $options['lock_start'] ?? false,
        lockEnd: $options['lock_end'] ?? false,
        lockDuration: $options['lock_duration'] ?? true,
    );
}

/**
 * @param  array<int, TaskNode>  $nodes
 * @param  list<array{0: int, 1: int}>  $edges
 */
function graph(array $nodes, array $edges = []): ScheduleGraph
{
    $keyed = [];

    foreach ($nodes as $taskNode) {
        $keyed[$taskNode->id] = $taskNode;
    }

    return new ScheduleGraph($keyed, $edges, WorkCalendar::default());
}

test('a violated successor slides to the day after its predecessor ends', function () {
    // Predecessor 1: Mon 2026-03-02 + 5cd → ends Fri 2026-03-06. Successor
    // overlaps (starts Wednesday), so it slides to Saturday (calendar days).
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 3),
    ], [[1, 2]]));

    expect($result->moves)->toHaveKey(2)
        ->and($result->moves[2]->toStart)->toBe('2026-03-07')
        ->and($result->moves[2]->toDuration)->toBe(3)
        ->and($result->moves[2]->reason)->toBe(TaskMove::REASON_DEPENDENCY_PUSH)
        ->and($result->moves[2]->causedByTaskId)->toBe(1)
        ->and($result->conflicts)->toBe([]);
});

test('a work-day successor of a friday finish starts the next monday', function () {
    // Predecessor ends Fri 2026-03-06; the work-day successor skips the weekend.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 2, ['unit' => DurationUnit::WorkDays]),
    ], [[1, 2]]));

    expect($result->moves[2]->toStart)->toBe('2026-03-09');
});

test('moving a predecessor earlier never pulls successors back', function () {
    // Successor starts well after the predecessor ends — push-only keeps slack.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 2),
        node(2, '2026-03-20', 3),
    ], [[1, 2]]));

    expect($result->moves)->toBe([])
        ->and($result->conflicts)->toBe([]);
});

test('a chain cascades in topological order', function () {
    // 1 (ends Mar 6) → 2 (pushed to Mar 7, ends Mar 9) → 3 (pushed to Mar 10).
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-03', 3),
        node(3, '2026-03-05', 2),
    ], [[1, 2], [2, 3]]));

    expect($result->moves[2]->toStart)->toBe('2026-03-07')
        ->and($result->moves[3]->toStart)->toBe('2026-03-10')
        ->and($result->moves[3]->causedByTaskId)->toBe(2);
});

test('a diamond takes the latest predecessor as the binding constraint', function () {
    // 3 depends on both 1 (ends Mar 3) and 2 (ends Mar 10); 2 wins.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 2),
        node(2, '2026-03-02', 9),
        node(3, '2026-03-04', 2),
    ], [[1, 3], [2, 3]]));

    expect($result->moves[3]->toStart)->toBe('2026-03-11')
        ->and($result->moves[3]->causedByTaskId)->toBe(2);
});

test('a pinned-start successor never moves and the edge becomes a conflict', function () {
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 3, ['lock_start' => true]),
        node(3, '2026-03-05', 2),
    ], [[1, 2], [2, 3]]));

    expect($result->moves)->not->toHaveKey(2)
        ->and($result->conflicts)->toHaveCount(1)
        ->and($result->conflicts[0]->predecessorId)->toBe(1)
        ->and($result->conflicts[0]->successorId)->toBe(2);
});

test('the cascade continues past a pinned task from its unmoved end', function () {
    // 2 is pinned and stays at Mar 4 (ends Mar 6); 3 only needs to clear
    // Mar 6, not 2's would-have-been position.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 3, ['lock_start' => true]),
        node(3, '2026-03-05', 2),
    ], [[1, 2], [2, 3]]));

    expect($result->moves[3]->toStart)->toBe('2026-03-07');
});

test('a fully pinned task (end and duration locked) never moves', function () {
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 3, ['lock_end' => true, 'lock_duration' => true]),
    ], [[1, 2]]));

    expect($result->moves)->toBe([])
        ->and($result->conflicts)->toHaveCount(1);
});

test('a deadline task compresses its duration against the locked end', function () {
    // 2 holds its end (Mar 4 + 8cd → Mar 11) and compresses: pushed to start
    // Mar 7, duration shrinks from 8 to 5 calendar days.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 8, ['lock_end' => true, 'lock_duration' => false]),
    ], [[1, 2]]));

    expect($result->moves[2]->toStart)->toBe('2026-03-07')
        ->and($result->moves[2]->toDuration)->toBe(5)
        ->and($result->moves[2]->reason)->toBe(TaskMove::REASON_DEADLINE_COMPRESSION)
        ->and($result->conflicts)->toBe([]);
});

test('a deadline that cannot absorb the push becomes a conflict', function () {
    // 2 ends Mar 5 but the predecessor ends Mar 6 — no duration ≥ 1 fits.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-04', 2, ['lock_end' => true, 'lock_duration' => false]),
    ], [[1, 2]]));

    expect($result->moves)->toBe([])
        ->and($result->conflicts)->toHaveCount(1);
});

test('unscheduled tasks neither move nor constrain', function () {
    $result = SchedulePropagator::propagate(graph([
        node(1, null, 5),
        node(2, '2026-03-04', 3),
        node(3, null, 2),
    ], [[1, 2], [2, 3]]));

    expect($result->moves)->toBe([])
        ->and($result->conflicts)->toBe([]);
});

test('a parent predecessor constrains through its subtree envelope', function () {
    // Parent 1 has children ending Mar 4 and Mar 10; the successor must clear
    // the envelope end (Mar 10).
    $result = SchedulePropagator::propagate(graph([
        node(1, null, 1),
        node(2, '2026-03-02', 3, ['parent' => 1]),
        node(3, '2026-03-02', 9, ['parent' => 1]),
        node(4, '2026-03-05', 2),
    ], [[1, 4]]));

    expect($result->moves[4]->toStart)->toBe('2026-03-11');
});

test('pushing a parent successor moves only its violated children', function () {
    // Edge 1 → 2 (parent). Child 3 overlaps and slides to Mar 7; child 4
    // already starts Mar 20 and keeps its slack (minimal movement).
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-03', 1),
        node(3, '2026-03-03', 2, ['parent' => 2]),
        node(4, '2026-03-20', 2, ['parent' => 2]),
    ], [[1, 2]]));

    expect($result->moves[3]->toStart)->toBe('2026-03-07')
        ->and($result->moves)->not->toHaveKey(4)
        ->and($result->moves[2]->reason)->toBe(TaskMove::REASON_ROLLUP)
        ->and($result->moves[2]->toStart)->toBe('2026-03-07');
});

test('parents roll up to their subtree envelope', function () {
    // Parent stored dates are stale; roll-up recomputes Mar 3 → Mar 21 (19cd).
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-01-01', 1),
        node(2, '2026-03-03', 2, ['parent' => 1]),
        node(3, '2026-03-20', 2, ['parent' => 1]),
    ]));

    expect($result->moves[1]->toStart)->toBe('2026-03-03')
        ->and($result->moves[1]->toDuration)->toBe(19)
        ->and($result->moves[1]->reason)->toBe(TaskMove::REASON_ROLLUP);
});

test('a work-day parent envelope falls back to calendar days when inexact', function () {
    // Children span Mon Mar 2 → Sun Mar 8; a work-day duration can never end
    // on a Sunday, so the parent flips to an exact 7-calendar-day span.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5, ['unit' => DurationUnit::WorkDays]),
        node(2, '2026-03-02', 5, ['parent' => 1, 'unit' => DurationUnit::WorkDays]),
        node(3, '2026-03-07', 2, ['parent' => 1]),
    ]));

    expect($result->moves[1]->toStart)->toBe('2026-03-02')
        ->and($result->moves[1]->toDuration)->toBe(7)
        ->and($result->moves[1]->toUnit)->toBe(DurationUnit::CalendarDays->value)
        ->and($result->moves[1]->unitChanged())->toBeTrue();
});

test('a parent with a fully unscheduled subtree becomes unscheduled', function () {
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, null, 2, ['parent' => 1]),
        node(3, null, 2, ['parent' => 1]),
    ]));

    expect($result->moves[1]->toStart)->toBeNull();
});

test('a dependency into an ancestor constrains the leaves of the subtree', function () {
    // Edge 1 → 2 (parent of 3): leaf 3 must clear 1's end even though the
    // edge targets its parent.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-03', 1),
        node(3, '2026-03-03', 2, ['parent' => 2]),
    ], [[1, 2]]));

    expect($result->moves[3]->toStart)->toBe('2026-03-07');
});

test('propagation is deterministic', function () {
    $build = fn (): ScheduleGraph => graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-03', 3),
        node(3, '2026-03-04', 2),
        node(4, '2026-03-05', 1),
    ], [[1, 2], [1, 3], [2, 4], [3, 4]]);

    $first = SchedulePropagator::propagate($build());
    $second = SchedulePropagator::propagate($build());

    $serialize = fn ($result): array => array_map(fn (TaskMove $move): array => $move->toArray(), $result->moves);

    expect($serialize($first))->toBe($serialize($second));
});

test('an existing conflict is reported even when nothing moves', function () {
    // Pre-existing overlap with a pinned successor and no seed change.
    $result = SchedulePropagator::propagate(graph([
        node(1, '2026-03-02', 5),
        node(2, '2026-03-03', 2, ['lock_start' => true]),
    ], [[1, 2]]));

    expect($result->moves)->toBe([])
        ->and($result->conflicts)->toHaveCount(1)
        ->and($result->conflicts[0]->key())->toBe('1-2');
});
