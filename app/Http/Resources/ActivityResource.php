<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Activitylog\Contracts\Activity;

/**
 * @mixin Activity
 */
class ActivityResource extends JsonResource
{
    /**
     * Newest activities rendered in a single History view. The trail is
     * append-only and never pruned (PRD §9), so reads must be capped to keep the
     * Inertia payload bounded. Callers fetch `RECENT_LIMIT + 1` rows; the extra
     * row lets the frontend (`components/activity-log.tsx`, which mirrors this
     * value) flag that older entries exist without a separate count query.
     */
    public const int RECENT_LIMIT = 50;

    /**
     * Transform an audit-log entry into the frontend payload. `attribute_changes`
     * carries the before/after values: `{ attributes: {...new}, old: {...prev} }`
     * (created entries omit `old`; deleted entries omit `attributes`).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event' => $this->event,
            'description' => $this->description,
            'causer' => $this->whenLoaded('causer', fn () => [
                'id' => $this->causer?->id,
                'name' => $this->causer?->name,
            ]),
            'attribute_changes' => $this->attribute_changes,
            // Free-form context for action entries (e.g. downloads); null today
            // unless a model's activityActionMeta() contributes data.
            'properties' => $this->properties,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
