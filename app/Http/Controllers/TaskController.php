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
        // One query for the whole project, assembled into a tree in memory so
        // the recursive `children` relation is set at every tier (the resource
        // serializes whenLoaded('children') down the tree). Cheap at the V1
        // scale cap (< 1,000 tasks).
        $tasks = $project->tasks()->with('creator')->ordered()->get();
        $byParent = $tasks->groupBy('parent_id');

        $tasks->each(function (Task $task) use ($byParent): void {
            $task->setRelation('children', $byParent->get($task->id, $task->newCollection())->values());
        });

        $roots = $tasks->whereNull('parent_id')->values();

        return Inertia::render('Tasks/Index', [
            'project' => new ProjectResource($project),
            'tasks' => TaskResource::collection($roots),
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

        $attributes = $request->safe()->except('parent_id');

        if (($attributes['start_date'] ?? null) === null) {
            $attributes['start_date'] = today();
        }

        $task = new Task($attributes);

        // Structural fields are derived server-side; they are not #[Fillable].
        $task->project_id = $project->id;
        $task->parent_id = $parent?->id;
        $task->hierarchy_level = $parent instanceof Task ? $parent->hierarchy_level + 1 : 1;
        $task->sort_order = $this->nextSortOrder($project, $parent);

        $task->save();

        TaskCreated::dispatch($task);

        return redirect()->route('projects.tasks.show', [$project, $task])
            ->with('status', 'Task created.');
    }

    /**
     * Update a task's metadata and schedule.
     */
    public function update(UpdateTaskRequest $request, Project $project, Task $task): RedirectResponse
    {
        $task->update($request->validated());

        TaskUpdated::dispatch($task);

        return redirect()->route('projects.tasks.show', [$project, $task])
            ->with('status', 'Task updated.');
    }

    /**
     * Delete a task and its subtree.
     */
    public function destroy(Project $project, Task $task): RedirectResponse
    {
        $this->authorize('update', $project);

        $task->delete();

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
