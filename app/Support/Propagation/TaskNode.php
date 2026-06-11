<?php

declare(strict_types=1);

namespace App\Support\Propagation;

use App\Enums\DurationUnit;
use Carbon\CarbonImmutable;

/**
 * An in-memory snapshot of one task inside a {@see ScheduleGraph}. The
 * propagator mutates the schedule fields (start, duration, unit) as it walks;
 * structural fields and locks are fixed for the run.
 */
class TaskNode
{
    /**
     * @param  list<int>  $childIds
     * @param  list<int>  $predecessorIds
     */
    public function __construct(
        public readonly int $id,
        public readonly ?int $parentId,
        public readonly string $name,
        public ?CarbonImmutable $start,
        public int $durationDays,
        public DurationUnit $unit,
        public readonly bool $lockStart,
        public readonly bool $lockEnd,
        public readonly bool $lockDuration,
        public array $childIds = [],
        public array $predecessorIds = [],
    ) {}

    public function isLeaf(): bool
    {
        return $this->childIds === [];
    }

    /**
     * Whether the start date is fixed — locked directly, or derived as fixed
     * because both end and duration are locked.
     */
    public function startIsPinned(): bool
    {
        return $this->lockStart || ($this->lockEnd && $this->lockDuration);
    }

    /**
     * A deadline task: only the end is locked, so a dependency push may
     * compress the duration against the fixed end.
     */
    public function isDeadline(): bool
    {
        return $this->lockEnd && ! $this->lockStart && ! $this->lockDuration;
    }
}
