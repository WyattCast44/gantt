<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the task into the frontend payload.
     *
     * Abilities are intentionally omitted: edit/delete depend only on the
     * project, so the frontend reuses ProjectResource.can.update (avoids
     * re-evaluating the policy per row, per DocumentResource).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'parent' => $this->whenLoaded('parent', fn () => $this->parent === null ? null : [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
                'status' => [
                    'value' => $this->parent->status->value,
                    'label' => $this->parent->status->label(),
                ],
                'percent_complete' => $this->parent->percent_complete,
            ]),
            'hierarchy_level' => $this->hierarchy_level,
            'sort_order' => $this->sort_order,
            'start_date' => $this->start_date?->toDateString(),
            'duration_days' => $this->duration_days,
            'duration_unit' => [
                'value' => $this->duration_unit->value,
                'label' => $this->duration_unit->label(),
            ],
            'end_date' => $this->endDate()?->toDateString(),
            'is_date_locked' => $this->is_date_locked,
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'risk_level' => [
                'value' => $this->risk_level->value,
                'label' => $this->risk_level->label(),
            ],
            'base_classification' => [
                'value' => $this->base_classification->value,
                'label' => $this->base_classification->label(),
            ],
            'organization' => $this->organization,
            'tags' => $this->tags ?? [],
            'percent_complete' => $this->percent_complete,
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'children' => TaskResource::collection($this->whenLoaded('children')),
            'has_incomplete_descendants' => $this->when(
                $this->relationLoaded('children'),
                fn () => $this->hasIncompleteDescendants(),
            ),
            'predecessors' => DependencyResource::collection($this->whenLoaded('predecessors')),
            'successors' => DependencyResource::collection($this->whenLoaded('successors')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'activities' => ActivityResource::collection($this->whenLoaded('activitiesAsSubject')),
        ];
    }
}
