<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectMemberRequest extends FormRequest
{
    /**
     * Owners and admins may change member roles.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manageMembers', $this->route('project')) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::enum(Role::class)->except([Role::Owner])],
        ];
    }

    /**
     * The validated role as an enum.
     */
    public function role(): Role
    {
        return Role::from($this->validated('role'));
    }
}
