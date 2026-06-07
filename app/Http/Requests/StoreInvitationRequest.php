<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\Role;
use App\Models\Project;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvitationRequest extends FormRequest
{
    /**
     * Owners and admins may invite members.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manageMembers', $this->route('project')) ?? false;
    }

    /**
     * Normalize the email before validation so guards and storage are
     * case-insensitive.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower((string) $this->input('email'))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', Rule::enum(Role::class)->except([Role::Owner])],
        ];
    }

    /**
     * Domain guards: cannot invite the owner, an existing member, or create a
     * duplicate pending invitation for the same project + email.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');
                $email = strtolower((string) $this->input('email'));

                if ($email === '' || ! $project instanceof Project) {
                    return;
                }

                if (strtolower((string) $project->owner->email) === $email) {
                    $validator->errors()->add('email', 'This person already owns the project.');

                    return;
                }

                if ($project->members()->whereRaw('lower(users.email) = ?', [$email])->exists()) {
                    $validator->errors()->add('email', 'This person is already a member of the project.');

                    return;
                }

                if ($project->invitations()->pending()->forEmail($email)->exists()) {
                    $validator->errors()->add('email', 'A pending invitation already exists for this email.');
                }
            },
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
