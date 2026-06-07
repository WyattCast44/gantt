<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may create tasks.
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'parent_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'start_date' => ['nullable', 'date'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'duration_unit' => ['required', Rule::enum(DurationUnit::class)],
            'is_date_locked' => ['boolean'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'percent_complete' => ['required', 'integer', 'between:0,100'],
            'risk_level' => ['required', Rule::enum(RiskLevel::class)],
            'organization' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'base_classification' => ['required', Rule::enum(BaseClassification::class)],
        ];
    }

    /**
     * Domain guards: the marking may not exceed the project baseline, and a
     * parent must belong to the same project and leave room under the depth cap.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');

                if (! $project instanceof Project) {
                    return;
                }

                $marking = $this->input('base_classification');

                if (is_string($marking)) {
                    $requested = BaseClassification::tryFrom($marking);

                    if ($requested !== null && ! $project->baseClassification()->dominates($requested)) {
                        $validator->errors()->add(
                            'base_classification',
                            'A task cannot be classified above the project baseline.',
                        );
                    }
                }

                $parent = $this->parentTask();

                if (! $parent instanceof Task) {
                    return;
                }

                if ($parent->project_id !== $project->id) {
                    $validator->errors()->add('parent_id', 'The parent task must belong to this project.');

                    return;
                }

                if (! $parent->canHaveChildren()) {
                    $validator->errors()->add(
                        'parent_id',
                        'Tasks may not be nested more than '.Task::MAX_DEPTH.' levels deep.',
                    );
                }
            },
        ];
    }

    /**
     * The task's classification marking as an enum.
     */
    public function classification(): BaseClassification
    {
        return BaseClassification::from($this->validated('base_classification'));
    }

    /**
     * The resolved parent task, if one was supplied.
     */
    public function parentTask(): ?Task
    {
        $parentId = $this->validated('parent_id');

        return $parentId === null ? null : Task::find($parentId);
    }
}
