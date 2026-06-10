<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RescheduleTaskRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may reschedule tasks by dragging on the Gantt.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    /**
     * Drag-to-reschedule only touches the schedule: a new start date and/or a
     * new duration. Day-grain (A5); the bar snaps to whole days client-side.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
        ];
    }
}
