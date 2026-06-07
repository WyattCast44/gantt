<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Number;

/**
 * @mixin Document
 */
class DocumentResource extends JsonResource
{
    /**
     * Transform the document into the frontend payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $type = $this->type();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'type' => [
                'value' => $type->value,
                'label' => $type->label(),
            ],
            'mime_type' => $this->mime_type,
            'original_filename' => $this->original_filename,
            'size_bytes' => $this->size_bytes,
            'size_label' => Number::fileSize($this->size_bytes),
            'base_classification' => [
                'value' => $this->base_classification->value,
                'label' => $this->base_classification->label(),
            ],
            'uploaded_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'download_url' => route('projects.documents.download', [$this->project_id, $this->id]),
            'preview_url' => route('projects.documents.preview', [$this->project_id, $this->id]),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
        ];
    }
}
