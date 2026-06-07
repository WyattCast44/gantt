<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProjectInvitation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class DeclineInvitationController
{
    use AuthorizesRequests;

    /**
     * Decline an invitation.
     */
    public function __invoke(ProjectInvitation $invitation): RedirectResponse
    {
        $this->authorize('respondToInvitation', $invitation);

        $invitation->decline();

        return redirect()->route('projects.index')
            ->with('status', 'Invitation declined.');
    }
}
