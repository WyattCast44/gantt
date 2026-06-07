<?php

declare(strict_types=1);

use App\Enums\InvitationStatus;

it('exposes a human-readable label for each case', function (): void {
    expect(InvitationStatus::Pending->label())->toBe('Pending')
        ->and(InvitationStatus::Accepted->label())->toBe('Accepted')
        ->and(InvitationStatus::Declined->label())->toBe('Declined')
        ->and(InvitationStatus::Revoked->label())->toBe('Revoked');
});

it('reports only the pending case as pending', function (): void {
    expect(InvitationStatus::Pending->isPending())->toBeTrue()
        ->and(InvitationStatus::Accepted->isPending())->toBeFalse()
        ->and(InvitationStatus::Declined->isPending())->toBeFalse()
        ->and(InvitationStatus::Revoked->isPending())->toBeFalse();
});
