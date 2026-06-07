<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    /**
     * Transform the project into the full workspace payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'base_classification' => [
                'value' => $this->base_classification->value,
                'label' => $this->base_classification->label(),
            ],
            'is_archived' => $this->trashed(),
            'viewer_role' => $this->roleFor($user)?->value,
            'can' => [
                'update' => $user->can('update', $this->resource),
                'manageMembers' => $user->can('manageMembers', $this->resource),
                'updateSettings' => $user->can('updateSettings', $this->resource),
                'delete' => $user->can('delete', $this->resource),
            ],
            'work_calendar' => $this->workCalendar()->toArray(),
        ];
    }
}
