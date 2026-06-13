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

class UpdateTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may edit tasks. Reparenting (and the subtree
     * re-leveling it implies) is deferred to the Phase 7 Gantt, so parent_id is
     * intentionally not editable here.
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
            'start_date' => ['nullable', 'date'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'duration_unit' => ['required', Rule::enum(DurationUnit::class)],
            'lock_start' => ['boolean'],
            'lock_end' => ['boolean'],
            'lock_duration' => ['boolean'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'percent_complete' => ['required', 'integer', 'between:0,100'],
            'risk_level' => ['required', Rule::enum(RiskLevel::class)],
            'organization' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'base_classification' => ['required', Rule::enum(BaseClassification::class)],
            'confirm' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Domain guards: at most two schedule locks, no schedule edits on a parent
     * (its dates are the engine-derived envelope of its children), and a task's
     * marking may not exceed the project baseline.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->lockCount() > 2) {
                    $validator->errors()->add(
                        'lock_start',
                        'At most two of start, end, and duration may be locked.',
                    );
                }

                if ($this->changesParentSchedule()) {
                    $validator->errors()->add(
                        'start_date',
                        'Dates on a task with subtasks are derived from its children.',
                    );
                }

                if ($this->changesParentProgress()) {
                    $validator->errors()->add(
                        'percent_complete',
                        'Progress on a task with subtasks is derived from its children.',
                    );
                }

                $project = $this->route('project');
                $marking = $this->input('base_classification');

                if (! $project instanceof Project || ! is_string($marking)) {
                    return;
                }

                $requested = BaseClassification::tryFrom($marking);

                if ($requested !== null && ! $project->baseClassification()->dominates($requested)) {
                    $validator->errors()->add(
                        'base_classification',
                        'A task cannot be classified above the project baseline.',
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
     * How many schedule locks the request asks for.
     */
    private function lockCount(): int
    {
        return (int) $this->boolean('lock_start')
            + (int) $this->boolean('lock_end')
            + (int) $this->boolean('lock_duration');
    }

    /**
     * Whether the request would alter a parent task's schedule. The form
     * always submits every field, so only actual changes are rejected —
     * resubmitting the derived values (e.g. a progress-only update) is fine.
     */
    private function changesParentSchedule(): bool
    {
        $task = $this->route('task');

        if (! $task instanceof Task || ! $task->children()->exists()) {
            return false;
        }

        $submittedStart = $this->input('start_date');

        return ($submittedStart === null ? null : (string) $submittedStart) !== $task->start_date?->toDateString()
            || (int) $this->input('duration_days') !== $task->duration_days
            || (string) $this->input('duration_unit') !== $task->duration_unit->value
            || $this->boolean('lock_start') !== $task->lock_start
            || $this->boolean('lock_end') !== $task->lock_end
            || $this->boolean('lock_duration') !== $task->lock_duration;
    }

    /**
     * Whether the request would alter a parent task's progress. A parent's
     * status/percent are the derived average of its children, so only actual
     * changes are rejected — resubmitting the derived values is fine.
     */
    private function changesParentProgress(): bool
    {
        $task = $this->route('task');

        if (! $task instanceof Task || ! $task->children()->exists()) {
            return false;
        }

        return (string) $this->input('status') !== $task->status->value
            || (int) $this->input('percent_complete') !== $task->percent_complete;
    }
}
