<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProjectInvitation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController
{
    /**
     * Show the invitation landing page (resolved by its token, the bearer
     * secret). Any authenticated visitor with the link may view it; only the
     * matching-email user may act on it.
     */
    public function show(Request $request, ProjectInvitation $invitation): Response
    {
        $invitation->loadMissing(['project', 'inviter']);

        return Inertia::render('Invitations/Show', [
            'invitation' => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => [
                    'value' => $invitation->role->value,
                    'label' => $invitation->role->label(),
                ],
                'project' => ['name' => $invitation->project->name],
                'invited_by' => $invitation->inviter?->name,
                'is_actionable' => $invitation->isActionable(),
                'can_respond' => strtolower((string) $request->user()->email) === strtolower($invitation->email),
            ],
        ]);
    }
}
