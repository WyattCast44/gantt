<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ProjectInvitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProjectInvitation
 */
class ProjectInvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => [
                'value' => $this->role->value,
                'label' => $this->role->label(),
            ],
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'is_expired' => $this->isExpired(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'invited_by' => $this->whenLoaded('inviter', fn () => $this->inviter?->name),
            'project' => $this->whenLoaded('project', fn () => ['name' => $this->project->name]),
            'accept_url' => route('invitations.show', $this->token),
        ];
    }
}
