<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A project member (a User carrying its `project_user` pivot role).
 *
 * @mixin User
 */
class ProjectMemberResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = Role::from($this->pivot->role);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => [
                'value' => $role->value,
                'label' => $role->label(),
            ],
            'is_owner' => $role === Role::Owner,
        ];
    }
}
