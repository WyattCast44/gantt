<?php

declare(strict_types=1);

namespace App\Support\Propagation;

/**
 * One task the propagator wants to move: the before/after schedule values and
 * the reason (a dependency push, a deadline compression, or a parent roll-up).
 */
class TaskMove
{
    public const string REASON_DEPENDENCY_PUSH = 'dependency_push';

    public const string REASON_DEADLINE_COMPRESSION = 'deadline_compression';

    public const string REASON_ROLLUP = 'rollup';

    public function __construct(
        public readonly int $taskId,
        public readonly string $name,
        public readonly string $reason,
        public readonly ?string $fromStart,
        public readonly ?string $toStart,
        public readonly int $fromDuration,
        public readonly int $toDuration,
        public readonly ?string $fromUnit = null,
        public readonly ?string $toUnit = null,
        public readonly ?int $causedByTaskId = null,
        public readonly ?string $causedByName = null,
    ) {}

    /**
     * Whether the duration unit changed (a parent envelope that could not be
     * expressed in its previous unit falls back to calendar days).
     */
    public function unitChanged(): bool
    {
        return $this->toUnit !== null && $this->toUnit !== $this->fromUnit;
    }

    /**
     * @return array<string, int|string|null>
     */
    public function toArray(): array
    {
        return [
            'task_id' => $this->taskId,
            'name' => $this->name,
            'reason' => $this->reason,
            'from_start' => $this->fromStart,
            'to_start' => $this->toStart,
            'from_duration' => $this->fromDuration,
            'to_duration' => $this->toDuration,
            'from_unit' => $this->fromUnit,
            'to_unit' => $this->toUnit,
            'caused_by_task_id' => $this->causedByTaskId,
            'caused_by_name' => $this->causedByName,
        ];
    }
}
