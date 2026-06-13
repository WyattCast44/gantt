<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\TaskUpdated;
use App\Http\Requests\RenameTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class RenameTaskController
{
    /**
     * Rename a task inline from the timeline. Name-only: no schedule fields
     * are involved, so the rules engine is not run. Redirects back so the
     * timeline reloads in place.
     */
    public function __invoke(RenameTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $task->update(['name' => $request->validated('name')]);

        TaskUpdated::dispatch($task);

        return redirect()->back()->with('status', 'Task renamed.');
    }
}
