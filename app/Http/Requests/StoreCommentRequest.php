<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BaseClassification;
use App\Models\Comment;
use App\Models\Project;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommentRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may comment on the document.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', [Comment::class, $this->route('document')]) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            'base_classification' => ['required', Rule::enum(BaseClassification::class)],
        ];
    }

    /**
     * Domain guard: a comment's marking may not exceed the project baseline.
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
                        'A comment cannot be classified above the project baseline.',
                    );
                }
            },
        ];
    }

    /**
     * The comment's classification marking as an enum.
     */
    public function classification(): BaseClassification
    {
        return BaseClassification::from($this->validated('base_classification'));
    }
}
