<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvitationRequest;
use App\Mail\ProjectInvitationMail;
use App\Models\Project;
use App\Models\ProjectInvitation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Mail;

class ProjectInvitationController
{
    use AuthorizesRequests;

    /**
     * Issue a pending invitation for the project and email the invitee.
     */
    public function store(StoreInvitationRequest $request, Project $project): RedirectResponse
    {
        $invitation = $project->invitations()->create([
            'inviter_id' => $request->user()->id,
            'email' => $request->validated('email'),
            'role' => $request->role(),
        ]);

        Mail::to($invitation->email)->queue(new ProjectInvitationMail($invitation));

        return redirect()->back()->with('status', 'Invitation sent.');
    }

    /**
     * Revoke a pending invitation.
     */
    public function destroy(Project $project, ProjectInvitation $invitation): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $invitation->revoke();

        return redirect()->back()->with('status', 'Invitation revoked.');
    }
}
