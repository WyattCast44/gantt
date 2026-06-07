<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
use App\Models\Project;
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
     * Domain guard: a task's marking may not exceed the project baseline.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
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
}
