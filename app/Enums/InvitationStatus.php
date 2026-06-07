<?php

declare(strict_types=1);

namespace App\Enums;

enum InvitationStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Revoked = 'revoked';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Accepted => 'Accepted',
            self::Declined => 'Declined',
            self::Revoked => 'Revoked',
        };
    }

    /**
     * Whether the invitation is still awaiting a response. Expiry is evaluated
     * separately against expires_at; a pending-but-expired invitation is no
     * longer actionable even though its stored status remains Pending.
     */
    public function isPending(): bool
    {
        return $this === self::Pending;
    }
}
