<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreDependencyRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may define dependencies.
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
            'predecessor_id' => ['required', 'integer', 'exists:tasks,id'],
        ];
    }

    /**
     * Domain guards: a predecessor must belong to the same project, differ from
     * the successor, not already be linked, and not close a dependency cycle.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');
                $task = $this->route('task');
                $predecessor = $this->predecessor();

                if (! $project instanceof Project || ! $task instanceof Task || ! $predecessor instanceof Task) {
                    return;
                }

                if ($predecessor->id === $task->id) {
                    $validator->errors()->add('predecessor_id', 'A task cannot depend on itself.');

                    return;
                }

                if ($predecessor->project_id !== $project->id) {
                    $validator->errors()->add('predecessor_id', 'The predecessor must belong to this project.');

                    return;
                }

                if ($task->predecessors()->whereKey($predecessor->id)->exists()) {
                    $validator->errors()->add('predecessor_id', 'That dependency already exists.');

                    return;
                }

                if ($task->wouldCreateCycle($predecessor)) {
                    $validator->errors()->add('predecessor_id', 'That dependency would create a circular reference.');
                }
            },
        ];
    }

    /**
     * The resolved predecessor task, if the id is valid.
     */
    public function predecessor(): ?Task
    {
        $id = $this->input('predecessor_id');

        return is_numeric($id) ? Task::find((int) $id) : null;
    }
}
