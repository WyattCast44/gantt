<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ReorderTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may reorder tasks.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer'],
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['integer'],
        ];
    }

    /**
     * Guard: `ordered_ids` must be exactly the sibling group — the full set of
     * task ids in this project sharing the given parent — so a request can only
     * permute an existing sibling group, never move, drop, or inject tasks.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');

                if (! $project instanceof Project) {
                    return;
                }

                $orderedIds = array_map('intval', $this->input('ordered_ids', []));

                $siblingIds = $project->tasks()
                    ->where('parent_id', $this->input('parent_id'))
                    ->pluck('id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();

                sort($orderedIds);
                sort($siblingIds);

                if ($orderedIds !== $siblingIds) {
                    $validator->errors()->add('ordered_ids', 'The order must list exactly the tasks in this sibling group.');
                }
            },
        ];
    }

    /**
     * The submitted sibling order (task ids).
     *
     * @return list<int>
     */
    public function orderedIds(): array
    {
        return array_map('intval', $this->validated('ordered_ids'));
    }
}
