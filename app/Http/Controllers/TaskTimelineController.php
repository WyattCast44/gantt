<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use Inertia\Inertia;
use Inertia\Response;

class TaskTimelineController
{
    /**
     * Render the Gantt timeline scoped to a single task and its subtree. Reuses
     * the Timeline/Show component and the same nested TaskResource shape as the
     * full project timeline (Project::taskSubtree), but hands the engine just
     * the focused task as the lone root. The ancestor chain rides alongside so
     * the page can render breadcrumb context without drawing ancestor bars.
     */
    public function __invoke(Project $project, Task $task): Response
    {
        return Inertia::render('Timeline/Show', [
            'project' => new ProjectResource($project),
            // predecessors drive the dependency connector lines on the Gantt.
            'tasks' => TaskResource::collection($project->taskSubtree($task, ['creator', 'predecessors'])),
            'scopeTask' => ['id' => $task->id, 'name' => $task->name],
            'ancestors' => $this->ancestors($task),
        ]);
    }

    /**
     * The parent chain from the topmost root down to the task's direct parent,
     * each as a minimal breadcrumb entry. Walks parent_id with one query per
     * tier; depth is capped at five tiers (PRD V1), so this stays cheap.
     *
     * @return list<array{id: int, name: string}>
     */
    private function ancestors(Task $task): array
    {
        $chain = [];

        for ($parent = $task->parent; $parent !== null; $parent = $parent->parent) {
            array_unshift($chain, ['id' => $parent->id, 'name' => $parent->name]);
        }

        return $chain;
    }
}
