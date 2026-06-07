<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProjectMemberRequest;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class ProjectMemberController
{
    use AuthorizesRequests;

    /**
     * Change an invited member's role.
     */
    public function update(UpdateProjectMemberRequest $request, Project $project, User $user): RedirectResponse
    {
        $project->updateMemberRole($user, $request->role());

        return redirect()->back()->with('status', 'Member role updated.');
    }

    /**
     * Remove an invited member from the project.
     */
    public function destroy(Project $project, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $project->removeMember($user);

        return redirect()->back()->with('status', 'Member removed.');
    }
}
