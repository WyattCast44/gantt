<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController
{
    use AuthorizesRequests;

    /**
     * Display the given project workspace.
     *
     * The `project.member` middleware gates the route group; this explicit
     * policy check keeps authorization visible at the action level.
     */
    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
        ]);
    }
}
