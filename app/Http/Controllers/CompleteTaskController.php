<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\TaskUpdated;
use App\Http\Requests\CompleteTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class CompleteTaskController
{
    /**
     * Mark a task complete, optionally cascading to its subtree.
     */
    public function __invoke(CompleteTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $updated = $task->markComplete($request->includesSubtasks());

        foreach ($updated as $updatedTask) {
            TaskUpdated::dispatch($updatedTask);
        }

        return redirect()->back()->with('status', 'Task marked complete.');
    }
}
