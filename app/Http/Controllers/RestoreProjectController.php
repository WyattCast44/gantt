<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class RestoreProjectController
{
    use AuthorizesRequests;

    /**
     * Restore a previously archived project.
     */
    public function __invoke(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->restore();

        return redirect()->route('projects.index')
            ->with('status', 'Project restored.');
    }
}
