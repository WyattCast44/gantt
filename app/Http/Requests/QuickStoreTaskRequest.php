<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class QuickStoreTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may quick-create tasks from the timeline.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    /**
     * Quick-create takes only a name and a position (parent + insert-after
     * sibling); every other field receives a server-side default so power
     * users can scaffold by typing names alone.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'after_id' => ['nullable', 'integer', 'exists:tasks,id'],
        ];
    }

    /**
     * Domain guards: the parent must belong to this project and leave room
     * under the depth cap; the insert-after reference must be a sibling of
     * the requested position (same project, same parent).
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');

                if (! $project instanceof Project) {
                    return;
                }

                $parent = $this->parentTask();

                if ($parent instanceof Task) {
                    if ($parent->project_id !== $project->id) {
                        $validator->errors()->add('parent_id', 'The parent task must belong to this project.');

                        return;
                    }

                    if (! $parent->canHaveChildren()) {
                        $validator->errors()->add(
                            'parent_id',
                            'Tasks may not be nested more than '.Task::MAX_DEPTH.' levels deep.',
                        );

                        return;
                    }
                }

                $after = $this->afterTask();

                if (! $after instanceof Task) {
                    return;
                }

                if ($after->project_id !== $project->id || $after->parent_id !== $parent?->id) {
                    $validator->errors()->add(
                        'after_id',
                        'The reference task must be a sibling at the requested position.',
                    );
                }
            },
        ];
    }

    /**
     * The smart-default start date: anchored to the insert-after sibling's
     * start, else the parent's, else today — so a quick task always lands on
     * the chart near where it was created instead of dragging a far-future
     * parent envelope back to today.
     */
    public function anchorStartDate(): string
    {
        return $this->afterTask()?->start_date?->toDateString()
            ?? $this->parentTask()?->start_date?->toDateString()
            ?? today()->toDateString();
    }

    /**
     * The resolved parent task, if one was supplied.
     */
    public function parentTask(): ?Task
    {
        $parentId = $this->validated('parent_id');

        return $parentId === null ? null : Task::find($parentId);
    }

    /**
     * The resolved insert-after sibling, if one was supplied.
     */
    public function afterTask(): ?Task
    {
        $afterId = $this->validated('after_id');

        return $afterId === null ? null : Task::find($afterId);
    }
}
