<?php

declare(strict_types=1);

namespace App\Support\Propagation;

/**
 * A violated finish-to-start edge: the successor starts on or before the
 * predecessor's end and could not (or may not) be moved. Conflicts are derived
 * state — they are recomputed from task data, never stored.
 */
class ScheduleConflict
{
    public function __construct(
        public readonly int $predecessorId,
        public readonly string $predecessorName,
        public readonly int $successorId,
        public readonly string $successorName,
        public readonly string $predecessorEnd,
        public readonly string $successorStart,
    ) {}

    /**
     * Stable identity for diffing conflict sets across a proposed change.
     */
    public function key(): string
    {
        return $this->predecessorId.'-'.$this->successorId;
    }

    /**
     * @return array<string, int|string>
     */
    public function toArray(): array
    {
        return [
            'predecessor_id' => $this->predecessorId,
            'predecessor_name' => $this->predecessorName,
            'successor_id' => $this->successorId,
            'successor_name' => $this->successorName,
            'predecessor_end' => $this->predecessorEnd,
            'successor_start' => $this->successorStart,
        ];
    }
}
