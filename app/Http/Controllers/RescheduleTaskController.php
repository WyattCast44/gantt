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
     * and clear the manual date lock (dragging is the user taking explicit
     * manual control of the schedule). Redirects back so the timeline reloads
     * in place rather than navigating to the task detail page.
     */
    public function __invoke(RescheduleTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $task->update([
            'start_date' => $request->validated('start_date'),
            'duration_days' => $request->integer('duration_days'),
            'is_date_locked' => false,
        ]);

        TaskUpdated::dispatch($task);

        return redirect()->back()->with('status', 'Task rescheduled.');
    }
}
