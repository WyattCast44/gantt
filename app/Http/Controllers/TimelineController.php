<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class TimelineController
{
    /**
     * Render the project's Gantt timeline. Feeds off the same nested task tree
     * as the task index (Project::taskTree), so the Gantt engine consumes
     * identical TaskResource arrays. Membership is gated by project.member; the
     * project range (start_date/end_date) rides on ProjectResource.
     */
    public function __invoke(Project $project): Response
    {
        return Inertia::render('Timeline/Show', [
            'project' => new ProjectResource($project),
            // predecessors drive the dependency connector lines on the Gantt.
            'tasks' => TaskResource::collection($project->taskTree(['creator', 'predecessors'])),
        ]);
    }
}
