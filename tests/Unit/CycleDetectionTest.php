<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Support\Propagation\ScheduleGraph;
use App\Support\Propagation\TaskNode;
use App\Support\WorkCalendar;

/**
 * @param  array<int, ?int>  $hierarchy  taskId => parentId
 * @param  list<array{0: int, 1: int}>  $edges
 */
function lineageGraph(array $hierarchy, array $edges = []): ScheduleGraph
{
    $nodes = [];

    foreach ($hierarchy as $id => $parentId) {
        $nodes[$id] = new TaskNode(
            id: $id,
            parentId: $parentId,
            name: "Task {$id}",
            start: null,
            durationDays: 1,
            unit: DurationUnit::CalendarDays,
            lockStart: false,
            lockEnd: false,
            lockDuration: true,
        );
    }

    return new ScheduleGraph($nodes, $edges, WorkCalendar::default());
}

test('a direct back-edge is a cycle', function () {
    $graph = lineageGraph([1 => null, 2 => null], [[1, 2]]);

    expect($graph->wouldLoop(2, 1))->toBeTrue()
        ->and($graph->wouldLoop(1, 1))->toBeTrue();
});

test('a transitive back-edge is a cycle', function () {
    $graph = lineageGraph([1 => null, 2 => null, 3 => null], [[1, 2], [2, 3]]);

    expect($graph->wouldLoop(3, 1))->toBeTrue();
});

test('a legal diamond is not a cycle', function () {
    $graph = lineageGraph([1 => null, 2 => null, 3 => null, 4 => null], [[1, 2], [1, 3], [2, 4]]);

    expect($graph->wouldLoop(3, 4))->toBeFalse();
});

test('an edge between ancestor and descendant loops in both directions', function () {
    $graph = lineageGraph([1 => null, 2 => 1, 3 => 2]);

    expect($graph->wouldLoop(1, 3))->toBeTrue()
        ->and($graph->wouldLoop(3, 1))->toBeTrue();
});

test('a hierarchy-induced loop is detected', function () {
    // X depends on parent P; adding P's child as a successor of X would let a
    // push of the child grow P's envelope and re-push X — a loop through the
    // hierarchy that a plain dependency DFS misses.
    $graph = lineageGraph([1 => null, 2 => 1, 3 => null], [[1, 3]]);

    expect($graph->wouldLoop(3, 2))->toBeTrue();
});

test('a sibling-subtree edge under a shared parent is legal', function () {
    // Children 2 and 3 share parent 1; linking 2 → 3 only grows the shared
    // envelope behind both — no constraint feeds back into 2.
    $graph = lineageGraph([1 => null, 2 => 1, 3 => 1]);

    expect($graph->wouldLoop(2, 3))->toBeFalse();
});
