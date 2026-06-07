<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lightweight project shape for the workspace switcher. Expects the project to
 * carry its `project_user` pivot (e.g. loaded via User::projects()).
 *
 * @mixin Project
 */
class ProjectSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            // Projects loaded via User::projects() carry a project_user pivot;
            // owned/archived projects (hasMany) do not. Guard the access so it
            // is safe under Model::shouldBeStrict().
            'role' => $this->resource->relationLoaded('pivot') ? $this->pivot->role : null,
            'status' => $this->status->value,
        ];
    }
}
