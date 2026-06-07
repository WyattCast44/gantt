<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskDocumentRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may attach documents to tasks.
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
            'document_id' => ['required', 'integer', 'exists:documents,id'],
        ];
    }

    /**
     * Domain guards: the document must belong to the same project and not
     * already be attached to the task.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');
                $task = $this->route('task');
                $document = $this->document();

                if (! $project instanceof Project || ! $task instanceof Task || ! $document instanceof Document) {
                    return;
                }

                if ($document->project_id !== $project->id) {
                    $validator->errors()->add('document_id', 'The document must belong to this project.');

                    return;
                }

                if ($task->documents()->whereKey($document->id)->exists()) {
                    $validator->errors()->add('document_id', 'That document is already attached.');
                }
            },
        ];
    }

    /**
     * The resolved document, if the id is valid.
     */
    public function document(): ?Document
    {
        $id = $this->input('document_id');

        return is_numeric($id) ? Document::find((int) $id) : null;
    }
}
