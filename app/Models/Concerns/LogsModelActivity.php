<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Enums\ActivityAction;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Shared activity-logging configuration applied to every domain model. Composes
 * Spatie's LogsActivity with project-wide defaults so the audit trail (PRD §9 /
 * FR-9) is consistent: each model's #[Fillable] attributes are tracked, only
 * real (dirty) changes are recorded, and empty changesets are skipped. The
 * previous/new values are written to the activity's `attribute_changes` column
 * by the package; the causer is the authenticated user (auto-resolved).
 *
 * Beyond attribute changes, `logAction()` records discrete user actions on the
 * resource (e.g. a file download) that don't mutate it.
 *
 * A model may narrow what is logged by declaring `protected array
 * $activityLogExcept` (e.g. User excludes its password hash).
 */
trait LogsModelActivity
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->logExcept($this->activityLogExcept())
            ->useLogName('default');
    }

    /**
     * Record a discrete action performed on this resource by the authenticated
     * user (the causer is auto-resolved). Unlike attribute-change logging, this
     * captures non-mutating actions — e.g. downloading a file. Any extra context
     * is merged over the per-model action metadata and persisted to the entry's
     * `properties` column; when there is none, `properties` stays null.
     *
     * @param  array<string, mixed>  $properties
     */
    public function logAction(ActivityAction $action, array $properties = []): void
    {
        $meta = array_merge($this->activityActionMeta(), $properties);

        $logger = activity()
            ->performedOn($this)
            ->event($action->value);

        if ($meta !== []) {
            $logger->withProperties($meta);
        }

        $logger->log($action->value);
    }

    /**
     * Extra context persisted with every action log entry for this model.
     * Returns an empty array today, so nothing extra is stored; this is the
     * single seam to later include request metadata (IP, user-agent, …) — every
     * action log then picks it up automatically without touching call sites.
     *
     * @return array<string, mixed>
     */
    protected function activityActionMeta(): array
    {
        return [];
    }

    /**
     * Attributes excluded from the activity log for this model (e.g. secrets).
     * Declared as a method (not a property access) so Eloquent's __get — which
     * would throw under shouldBeStrict() for an undeclared property — is bypassed.
     *
     * @return array<int, string>
     */
    protected function activityLogExcept(): array
    {
        return property_exists($this, 'activityLogExcept') ? $this->activityLogExcept : [];
    }
}
