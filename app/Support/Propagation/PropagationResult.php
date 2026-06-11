<?php

declare(strict_types=1);

namespace App\Support\Propagation;

/**
 * The outcome of one propagation run: the tasks that should move and the
 * conflicts present in the resulting schedule.
 */
class PropagationResult
{
    /**
     * @param  array<int, TaskMove>  $moves  Keyed by task id.
     * @param  list<ScheduleConflict>  $conflicts
     */
    public function __construct(
        public readonly array $moves,
        public readonly array $conflicts,
    ) {}

    public function hasMoves(): bool
    {
        return $this->moves !== [];
    }

    public function hasConflicts(): bool
    {
        return $this->conflicts !== [];
    }

    /**
     * Moves that cascade beyond the task the user edited directly.
     *
     * @return array<int, TaskMove>
     */
    public function movesExcept(int $taskId): array
    {
        return array_filter($this->moves, fn (TaskMove $move): bool => $move->taskId !== $taskId);
    }

    /**
     * The user-meaningful cascade: tasks pushed or compressed by a dependency,
     * excluding parent roll-up bookkeeping (a parent envelope tracking its
     * children is implied, not news).
     *
     * @return array<int, TaskMove>
     */
    public function pushedMoves(?int $exceptTaskId = null): array
    {
        return array_filter(
            $this->moves,
            fn (TaskMove $move): bool => $move->reason !== TaskMove::REASON_ROLLUP
                && $move->taskId !== $exceptTaskId,
        );
    }

    /**
     * The conflicts this run would introduce relative to a pre-change set.
     *
     * @param  list<ScheduleConflict>  $existing
     * @return list<ScheduleConflict>
     */
    public function newConflictsVersus(array $existing): array
    {
        $existingKeys = array_map(
            fn (ScheduleConflict $conflict): string => $conflict->key(),
            $existing,
        );

        return array_values(array_filter(
            $this->conflicts,
            fn (ScheduleConflict $conflict): bool => ! in_array($conflict->key(), $existingKeys, true),
        ));
    }

    /**
     * The flashable preview payload for the dry-run/confirm protocol. Lists
     * the user-meaningful cascade (pushes and compressions, not roll-ups) and
     * the conflicts the change would introduce.
     *
     * @param  list<ScheduleConflict>  $newConflicts
     * @return array{moves: list<array<string, int|string|null>>, conflicts: list<array<string, int|string>>}
     */
    public function toPreviewPayload(array $newConflicts): array
    {
        return [
            'moves' => array_values(array_map(
                fn (TaskMove $move): array => $move->toArray(),
                $this->pushedMoves(),
            )),
            'conflicts' => array_map(
                fn (ScheduleConflict $conflict): array => $conflict->toArray(),
                $newConflicts,
            ),
        ];
    }
}
