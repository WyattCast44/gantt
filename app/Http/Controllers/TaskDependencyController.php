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
     * Add a finish-to-start predecessor to a task. The rules engine previews
     * the new edge first: a violated movable successor is pushed into place
     * on commit, while a cascade that would introduce conflicts (e.g. the
     * successor is pinned) is flashed back for confirmation instead.
     */
    public function store(StoreDependencyRequest $request, Project $project, Task $task): RedirectResponse
    {
        $predecessor = $request->predecessor();

        $before = $project->scheduleGraph()->conflicts();
        $result = $project->previewSchedule([], [[$predecessor->id, $task->id]]);
        $newConflicts = $result->newConflictsVersus($before);

        if ($newConflicts !== [] && ! $request->boolean('confirm')) {
            return redirect()->back()->with('schedulePreview', [
                'intent' => 'dependency',
                'task_id' => $task->id,
                'input' => ['predecessor_id' => $predecessor->id],
                ...$result->toPreviewPayload($newConflicts),
            ]);
        }

        $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
        $task->logAction(ActivityAction::DependencyAdded, ['predecessor' => $predecessor->name]);

        // The new edge may push the successor (and its own successors); the
        // predecessor is the cause and never moves itself.
        $project->commitSchedule($result, $predecessor);

        $movedCount = count($result->pushedMoves());

        return redirect()->back()->with('status', match (true) {
            $movedCount === 0 => 'Dependency added.',
            $movedCount === 1 => 'Dependency added — 1 task moved.',
            default => "Dependency added — {$movedCount} tasks moved.",
        });
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
