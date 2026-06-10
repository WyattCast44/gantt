<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ActivityAction;
use App\Http\Requests\ReorderTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ReorderTasksController
{
    /**
     * Reorder a sibling group of tasks from the Gantt timeline (buttons or
     * drag). The request validates that the ids are exactly one sibling group;
     * spatie's setNewOrder writes the new sort_order in the submitted sequence.
     * Reorder is recorded as an audit action on the parent (or the project for
     * root-level tasks); it dispatches no domain event since nothing about a
     * task's schedule or content changes.
     */
    public function __invoke(ReorderTaskRequest $request, Project $project): RedirectResponse
    {
        $orderedIds = $request->orderedIds();
        $parentId = $request->integer('parent_id') ?: null;

        DB::transaction(fn () => Task::setNewOrder($orderedIds));

        $subject = $parentId === null ? $project : $project->tasks()->find($parentId);
        $subject?->logAction(ActivityAction::Reordered);

        return redirect()->back()->with('status', 'Tasks reordered.');
    }
}
