<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\TaskUpdated;
use App\Http\Requests\RescheduleTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class RescheduleTaskController
{
    /**
     * Reschedule a task from a Gantt drag: set the new start date and duration,
     * then run the rules engine so violated finish-to-start successors are
     * pushed. Lock flags are left untouched — locks protect against automatic
     * movement by the engine, never against an explicit user drag (the dragged
     * task is likewise pinned for the run, so the engine never bounces the
     * user's placement). A cascade that would introduce new conflicts is not
     * committed: the preview is flashed back for confirmation instead.
     * Redirects back so the timeline reloads in place.
     */
    public function __invoke(RescheduleTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $input = [
            'start_date' => $request->validated('start_date'),
            'duration_days' => $request->integer('duration_days'),
        ];

        $before = $project->scheduleGraph()->conflicts();
        $result = $project->previewSchedule([
            $task->id => [...$input, 'lock_start' => true],
        ]);
        $newConflicts = $result->newConflictsVersus($before);

        if ($newConflicts !== [] && ! $request->boolean('confirm')) {
            return redirect()->back()->with('schedulePreview', [
                'intent' => 'reschedule',
                'task_id' => $task->id,
                'input' => $input,
                ...$result->toPreviewPayload($newConflicts),
            ]);
        }

        $task->update($input);

        TaskUpdated::dispatch($task);

        $project->commitSchedule($result, $task);

        return redirect()->back()->with('status', $this->status(count($result->pushedMoves($task->id))));
    }

    /**
     * The flash summary, counting any cascade beyond the dragged task.
     */
    private function status(int $movedCount): string
    {
        return match (true) {
            $movedCount === 0 => 'Task rescheduled.',
            $movedCount === 1 => 'Task rescheduled — 1 dependent task moved.',
            default => "Task rescheduled — {$movedCount} dependent tasks moved.",
        };
    }
}
