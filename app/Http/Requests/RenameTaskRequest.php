<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RenameTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may rename tasks inline on the timeline.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    /**
     * Inline rename touches the name only; a name change can never move
     * dates, so no schedule fields (and no rules-engine run) are involved.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
