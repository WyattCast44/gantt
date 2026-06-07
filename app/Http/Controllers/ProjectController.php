<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectInvitationResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\ProjectSummaryResource;
use App\Models\Project;
use App\Models\ProjectInvitation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController
{
    use AuthorizesRequests;

    /**
     * List the projects the user can access, plus any they have archived.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // The shared `recentProjects` prop is capped for the switcher; the index
        // shows the full accessible list under its own prop.
        return Inertia::render('Projects/Index', [
            'projects' => ProjectSummaryResource::collection(
                $user->projects()->orderBy('name')->get()
            ),
            'archivedProjects' => ProjectSummaryResource::collection(
                $user->ownedProjects()->onlyTrashed()->orderBy('name')->get()
            ),
            'pendingInvitations' => ProjectInvitationResource::collection(
                ProjectInvitation::pending()->forEmail($user->email)->with(['project', 'inviter'])->latest()->get()
            ),
        ]);
    }

    /**
     * Show the create-project form.
     */
    public function create(): Response
    {
        $this->authorize('create', Project::class);

        return Inertia::render('Projects/Create');
    }

    /**
     * Persist a new project owned by the current user.
     */
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = Project::create([
            ...$request->validated(),
            'owner_id' => $request->user()->id,
        ]);

        return redirect()->route('projects.show', $project)
            ->with('status', 'Project created.');
    }

    /**
     * Display the given project workspace.
     */
    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projects/Show', [
            'project' => new ProjectResource($project),
        ]);
    }

    /**
     * Update general project settings.
     */
    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        return redirect()->back()->with('status', 'Project updated.');
    }

    /**
     * Archive (soft delete) the project.
     */
    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()->route('projects.index')
            ->with('status', 'Project archived.');
    }
}
