<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\DependencyResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController
{
    use AuthorizesRequests;

    /**
     * List the project's tasks as a nested tree.
     */
    public function index(Project $project): Response
    {
        return Inertia::render('Tasks/Index', [
            'project' => new ProjectResource($project),
            'tasks' => TaskResource::collection($project->taskTree()),
        ]);
    }

    /**
     * Show the create-task form.
     */
    public function create(Request $request, Project $project): Response
    {
        $this->authorize('update', $project);

        $defaultParentId = null;

        if ($request->filled('parent_id')) {
            $parent = $project->tasks()->find($request->integer('parent_id'));

            if ($parent?->canHaveChildren()) {
                $defaultParentId = $parent->id;
            }
        }

        return Inertia::render('Tasks/Create', [
            'project' => new ProjectResource($project),
            'parents' => TaskResource::collection(
                $project->tasks()->where('hierarchy_level', '<', Task::MAX_DEPTH)->orderBy('name')->get()
            ),
            'defaultParentId' => $defaultParentId,
        ]);
    }

    /**
     * Show a single task with its subtree, comments, and audit trail.
     */
    public function show(Project $project, Task $task): Response
    {
        // Set the relations the CommentPolicy walks (commentable -> project)
        // from the models in hand, so authorization adds no per-comment queries.
        $task->setRelation('project', $project);

        $task->load([
            'creator',
            'parent',
            'children' => fn ($query) => $query->with('creator'),
            'predecessors',
            'successors',
            'documents' => fn ($query) => $query->with('creator')->latest(),
            'comments' => fn ($query) => $query->with('creator')->latest(),
            'activitiesAsSubject' => fn ($query) => $query->with('causer')->latest()
                ->limit(ActivityResource::RECENT_LIMIT + 1),
        ]);

        $task->comments->each(
            fn (Comment $comment) => $comment->setRelation('commentable', $task),
        );

        return Inertia::render('Tasks/Show', [
            'project' => new ProjectResource($project),
            'task' => new TaskResource($task),
            // Candidate predecessors for the dependency picker (every other task
            // in the project); cycle/duplicate guards live in the FormRequest.
            'availableTasks' => DependencyResource::collection(
                $project->tasks()->whereKeyNot($task->id)->orderBy('name')->get()
            ),
            // Project documents available to attach (the picker filters out the
            // ones already attached client-side).
            'projectDocuments' => DocumentResource::collection(
                $project->documents()->with('creator')->orderBy('name')->get()
            ),
        ]);
    }

    /**
     * Create a task (optionally nested under a parent).
     */
    public function store(StoreTaskRequest $request, Project $project): RedirectResponse
    {
        $parent = $request->parentTask();

        $task = new Task($request->safe()->except('parent_id'));

        // Structural fields are derived server-side; they are not #[Fillable].
        $task->project_id = $project->id;
        $task->parent_id = $parent?->id;
        $task->hierarchy_level = $parent instanceof Task ? $parent->hierarchy_level + 1 : 1;
        $task->sort_order = $this->nextSortOrder($project, $parent);

        $task->save();

        TaskCreated::dispatch($task);

        // Re-run the rules engine: the new leaf reshapes its ancestors'
        // envelopes and may push tasks depending on them. The new task itself
        // is pinned for the run — explicit user placement is respected, and
        // any violation it creates surfaces as a derived conflict instead.
        $project->commitSchedule(
            $project->previewSchedule([$task->id => ['lock_start' => true]]),
            $task,
        );

        return redirect()->route('projects.tasks.show', [$project, $task])
            ->with('status', 'Task created.');
    }

    /**
     * Update a task's metadata and schedule, running the rules engine over any
     * schedule change. The edited task is pinned for the run (explicit user
     * placement is never bounced); a cascade that would introduce new
     * conflicts is flashed back as a preview instead of committing.
     */
    public function update(UpdateTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $input = $request->safe()->except('confirm');

        $before = $project->scheduleGraph()->conflicts();
        $result = $project->previewSchedule([
            $task->id => [
                'start_date' => $input['start_date'] ?? null,
                'duration_days' => $input['duration_days'],
                'duration_unit' => $input['duration_unit'],
                'lock_start' => true,
            ],
        ]);
        $newConflicts = $result->newConflictsVersus($before);

        if ($newConflicts !== [] && ! $request->boolean('confirm')) {
            return redirect()->back()->with('schedulePreview', [
                'intent' => 'update',
                'task_id' => $task->id,
                'input' => $input,
                ...$result->toPreviewPayload($newConflicts),
            ]);
        }

        $task->update($input);

        TaskUpdated::dispatch($task);

        $project->commitSchedule($result, $task);

        $movedCount = count($result->pushedMoves($task->id));

        return redirect()->route('projects.tasks.show', [$project, $task])
            ->with('status', match (true) {
                $movedCount === 0 => 'Task updated.',
                $movedCount === 1 => 'Task updated — 1 dependent task moved.',
                default => "Task updated — {$movedCount} dependent tasks moved.",
            });
    }

    /**
     * Delete a task and its subtree.
     */
    public function destroy(Project $project, Task $task): RedirectResponse
    {
        $this->authorize('update', $project);

        $task->delete();

        // Roll ancestors' envelopes back up without the deleted subtree. No
        // confirm gate: push-only propagation means a shrinking envelope can
        // never move anything else.
        $project->commitSchedule($project->previewSchedule(), $task);

        // Redirect to the index rather than back() so deleting from the show
        // page (whose URL now 404s) lands somewhere valid.
        return redirect()
            ->route('projects.tasks.index', $project)
            ->with('status', 'Task deleted.');
    }

    /**
     * The next sibling sort order under a parent (or at the project root).
     */
    private function nextSortOrder(Project $project, ?Task $parent): int
    {
        return (int) $project->tasks()
            ->where('parent_id', $parent?->id)
            ->max('sort_order') + 1;
    }
}
