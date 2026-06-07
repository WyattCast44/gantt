<?php

declare(strict_types=1);

use App\Enums\InvitationStatus;
use App\Models\ProjectInvitation;

/**
 * Build a bare invitation instance (no persistence) to exercise the
 * expiry/actionability predicates. Runs in the Feature suite because the
 * datetime casts require the booted framework.
 */
function invitation(InvitationStatus $status, ?DateTimeInterface $expiresAt): ProjectInvitation
{
    $invitation = new ProjectInvitation;
    $invitation->status = $status;
    $invitation->expires_at = $expiresAt;

    return $invitation;
}

it('treats a pending invitation past its expiry as expired', function (): void {
    expect(invitation(InvitationStatus::Pending, now()->subDay())->isExpired())->toBeTrue()
        ->and(invitation(InvitationStatus::Pending, now()->addDay())->isExpired())->toBeFalse()
        ->and(invitation(InvitationStatus::Pending, null)->isExpired())->toBeFalse();
});

it('is actionable only while pending and not expired', function (): void {
    expect(invitation(InvitationStatus::Pending, now()->addDay())->isActionable())->toBeTrue()
        ->and(invitation(InvitationStatus::Pending, null)->isActionable())->toBeTrue()
        ->and(invitation(InvitationStatus::Pending, now()->subDay())->isActionable())->toBeFalse()
        ->and(invitation(InvitationStatus::Accepted, now()->addDay())->isActionable())->toBeFalse()
        ->and(invitation(InvitationStatus::Declined, now()->addDay())->isActionable())->toBeFalse()
        ->and(invitation(InvitationStatus::Revoked, now()->addDay())->isActionable())->toBeFalse();
});
