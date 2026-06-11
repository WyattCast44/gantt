<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Support\Propagation\ScheduleGraph;
use App\Support\Propagation\SchedulePropagator;
use App\Support\Propagation\TaskNode;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Phase 8 makes parent task dates engine-derived envelopes of their
     * subtrees. Backfill existing parents by running the pure roll-up over
     * each project's tasks (no dependency edges, so nothing is pushed — only
     * parent envelopes are recomputed). Raw rows in, raw updates out; no
     * Eloquent models or events.
     */
    public function up(): void
    {
        $rows = DB::table('tasks')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'project_id', 'parent_id', 'name', 'start_date', 'duration_days', 'duration_unit', 'lock_start', 'lock_end', 'lock_duration']);

        foreach ($rows->groupBy('project_id') as $projectRows) {
            $nodes = [];

            foreach ($projectRows as $row) {
                $nodes[(int) $row->id] = new TaskNode(
                    id: (int) $row->id,
                    parentId: $row->parent_id === null ? null : (int) $row->parent_id,
                    name: (string) $row->name,
                    start: $row->start_date === null ? null : CarbonImmutable::parse((string) $row->start_date),
                    durationDays: (int) $row->duration_days,
                    unit: DurationUnit::from((string) $row->duration_unit),
                    lockStart: (bool) $row->lock_start,
                    lockEnd: (bool) $row->lock_end,
                    lockDuration: (bool) $row->lock_duration,
                );
            }

            $result = SchedulePropagator::propagate(
                new ScheduleGraph($nodes, [], WorkCalendar::default()),
            );

            foreach ($result->moves as $taskId => $move) {
                DB::table('tasks')->where('id', $taskId)->update([
                    'start_date' => $move->toStart,
                    'duration_days' => $move->toDuration,
                    'duration_unit' => $move->toUnit,
                ]);
            }
        }
    }

    /**
     * Irreversible data normalization: the previous manual parent dates are
     * not recoverable. Leaving the envelopes in place is harmless.
     */
    public function down(): void
    {
        // No-op.
    }
};
