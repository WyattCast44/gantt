<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BaseClassification;
use App\Models\Project;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may edit document metadata.
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
            'base_classification' => ['required', Rule::enum(BaseClassification::class)],
        ];
    }

    /**
     * Domain guard: a document's marking may not exceed the project baseline.
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
                        'A document cannot be classified above the project baseline.',
                    );
                }
            },
        ];
    }
}
