<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProjectInvitation;
use App\Models\User;

class ProjectInvitationPolicy
{
    /**
     * An invitee may respond (accept/decline) when their email matches the
     * invitation. A valid token link is handled as a bearer secret in the
     * controller and does not flow through this check.
     */
    public function respondToInvitation(User $user, ProjectInvitation $invitation): bool
    {
        return strtolower($user->email) === strtolower($invitation->email);
    }
}
