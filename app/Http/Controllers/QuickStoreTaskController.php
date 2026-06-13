<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
use App\Events\TaskCreated;
use App\Http\Requests\QuickStoreTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class QuickStoreTaskController
{
    /**
     * Create a task from the timeline by name alone. The position (parent +
     * insert-after sibling) comes from the draft row; everything else is a
     * smart default. The start date anchors to its context — the reference
     * sibling's start, else the parent's, else today — so a quick task always
     * lands on the chart near where it was created instead of dragging a
     * far-future parent envelope back to today. No schedule locks are set:
     * a scaffolded task stays movable, so linking dependencies afterwards
     * slides it into place rather than raising conflicts.
     */
    public function __invoke(QuickStoreTaskRequest $request, Project $project): RedirectResponse
    {
        $parent = $request->parentTask();
        $after = $request->afterTask();

        $task = new Task([
            'name' => $request->validated('name'),
            'start_date' => $request->anchorStartDate(),
            'duration_days' => 1,
            'duration_unit' => DurationUnit::WorkDays,
            'lock_start' => false,
            'lock_end' => false,
            'lock_duration' => true,
            'status' => TaskStatus::NotStarted,
            'percent_complete' => 0,
            'risk_level' => RiskLevel::Low,
            'base_classification' => BaseClassification::UNCLASSIFIED,
        ]);

        // Structural fields are derived server-side; they are not #[Fillable].
        $task->project_id = $project->id;
        $task->parent_id = $parent?->id;
        $task->hierarchy_level = $parent instanceof Task ? $parent->hierarchy_level + 1 : 1;

        DB::transaction(function () use ($project, $parent, $after, $task): void {
            $task->sort_order = $this->insertSortOrder($project, $parent, $after);

            if ($after instanceof Task) {
                $project->tasks()
                    ->where('parent_id', $parent?->id)
                    ->where('sort_order', '>', $after->sort_order)
                    ->increment('sort_order');
            }

            $task->save();
        });

        TaskCreated::dispatch($task);

        // Re-run the rules engine: the new leaf reshapes its ancestors'
        // envelopes and may push tasks depending on them. The new task itself
        // is pinned for the run — explicit user placement is respected, and
        // any violation it creates surfaces as a derived conflict instead.
        $project->commitSchedule(
            $project->previewSchedule([$task->id => ['lock_start' => true]]),
            $task,
        );

        return redirect()->back()->with('status', 'Task created.');
    }

    /**
     * The new task's slot: directly after the reference sibling, else at the
     * end of the sibling group.
     */
    private function insertSortOrder(Project $project, ?Task $parent, ?Task $after): int
    {
        if ($after instanceof Task) {
            return $after->sort_order + 1;
        }

        return (int) $project->tasks()
            ->where('parent_id', $parent?->id)
            ->max('sort_order') + 1;
    }
}
