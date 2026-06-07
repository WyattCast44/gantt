<?php

declare(strict_types=1);

namespace App\Models;

use RuntimeException;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

/**
 * The audit log is append-only (PRD §9 / FR-9): entries are written once and can
 * never be edited or deleted. This model enforces that immutability at the
 * Eloquent layer by rejecting any update or delete of an existing activity row.
 * The underlying domain data stays mutable; only the trail is frozen.
 *
 * Registered as the activity model via config/activitylog.php. The previous/new
 * values land in `attribute_changes` (populated by the package).
 */
class Activity extends SpatieActivity
{
    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new RuntimeException('Activity log entries are append-only and cannot be modified.');
        });

        static::deleting(function (): never {
            throw new RuntimeException('Activity log entries are append-only and cannot be deleted.');
        });
    }
}
