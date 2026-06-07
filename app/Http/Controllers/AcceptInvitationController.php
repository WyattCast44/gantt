<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProjectInvitation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AcceptInvitationController
{
    use AuthorizesRequests;

    /**
     * Accept an invitation and join the project.
     */
    public function __invoke(Request $request, ProjectInvitation $invitation): RedirectResponse
    {
        $this->authorize('respondToInvitation', $invitation);

        $invitation->accept($request->user());

        return redirect()->route('projects.show', $invitation->project)
            ->with('status', 'Invitation accepted.');
    }
}
