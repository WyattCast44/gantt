<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Any authenticated user may create a project (becoming its owner).
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Any member (owner or invited) may view the project.
     */
    public function view(User $user, Project $project): bool
    {
        return $project->isMember($user);
    }

    /**
     * Owners, admins, and editors may modify project data.
     */
    public function update(User $user, Project $project): bool
    {
        return $project->roleFor($user)?->canEdit() ?? false;
    }

    /**
     * Owners and admins may invite/remove members and change roles.
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $project->roleFor($user)?->canManageMembers() ?? false;
    }

    /**
     * Owners and admins may change project settings, calendars, and classification.
     */
    public function updateSettings(User $user, Project $project): bool
    {
        return $project->roleFor($user)?->canConfigureProject() ?? false;
    }

    /**
     * Only the owner may delete (archive) the project.
     */
    public function delete(User $user, Project $project): bool
    {
        return $project->isOwner($user);
    }
}
