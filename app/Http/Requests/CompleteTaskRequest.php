<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class CompleteTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may complete tasks.
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
            'include_subtasks' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * A parent with incomplete descendants must explicitly include them.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $task = $this->route('task');

                if (! $task instanceof Task) {
                    return;
                }

                if ($this->boolean('include_subtasks')) {
                    return;
                }

                if ($task->hasIncompleteDescendants()) {
                    $validator->errors()->add(
                        'include_subtasks',
                        'Complete all subtasks first, or include them when marking this task complete.',
                    );
                }
            },
        ];
    }

    /**
     * Whether descendant tasks should be marked complete as well.
     */
    public function includesSubtasks(): bool
    {
        return $this->boolean('include_subtasks');
    }
}
