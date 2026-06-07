<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\ProjectInvitationResource;
use App\Http\Resources\ProjectMemberResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSettingsController
{
    use AuthorizesRequests;

    /**
     * Display the project settings (general, members, danger).
     */
    public function __invoke(Project $project): Response
    {
        $this->authorize('updateSettings', $project);

        return Inertia::render('Projects/Settings', [
            'project' => new ProjectResource($project),
            'members' => ProjectMemberResource::collection(
                $project->members()->orderByPivot('role')->orderBy('name')->get()
            ),
            'invitations' => ProjectInvitationResource::collection(
                $project->invitations()->where('status', 'pending')->with('inviter')->latest()->get()
            ),
            // Append-only audit trail for the project (PRD §9), newest first,
            // capped to a recent window (+1 row to flag older entries exist).
            'activities' => ActivityResource::collection(
                $project->activitiesAsSubject()->with('causer')->latest()
                    ->limit(ActivityResource::RECENT_LIMIT + 1)->get()
            ),
        ]);
    }
}
