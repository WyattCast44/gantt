<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ActivityAction;
use App\Http\Requests\StoreDependencyRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class TaskDependencyController
{
    use AuthorizesRequests;

    /**
     * Add a finish-to-start predecessor to a task.
     */
    public function store(StoreDependencyRequest $request, Project $project, Task $task): RedirectResponse
    {
        $predecessor = $request->predecessor();

        $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
        $task->logAction(ActivityAction::DependencyAdded, ['predecessor' => $predecessor->name]);

        return redirect()->back()->with('status', 'Dependency added.');
    }

    /**
     * Remove a predecessor from a task.
     */
    public function destroy(Project $project, Task $task, Task $predecessor): RedirectResponse
    {
        $this->authorize('update', $project);

        $task->predecessors()->detach($predecessor->id);
        $task->logAction(ActivityAction::DependencyRemoved, ['predecessor' => $predecessor->name]);

        return redirect()->back()->with('status', 'Dependency removed.');
    }
}
