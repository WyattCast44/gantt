<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BaseClassification;
use App\Models\Project;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    /**
     * Owners, admins, and editors may upload documents.
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
        $fileRules = ['file', 'max:51200', 'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,csv,txt'];

        return [
            'file' => ['nullable', 'required_without:files', ...$fileRules],
            'files' => ['nullable', 'required_without:file', 'array', 'min:1'],
            'files.*' => $fileRules,
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'base_classification' => ['required', Rule::enum(BaseClassification::class)],
            'file_meta' => ['nullable', 'array'],
            'file_meta.*.description' => ['nullable', 'string', 'max:5000'],
            'file_meta.*.base_classification' => ['nullable', Rule::enum(BaseClassification::class)],
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

                if (! $project instanceof Project) {
                    return;
                }

                $defaultMarking = $this->input('base_classification');

                if (is_string($defaultMarking)) {
                    $requested = BaseClassification::tryFrom($defaultMarking);

                    if ($requested !== null && ! $project->baseClassification()->dominates($requested)) {
                        $validator->errors()->add(
                            'base_classification',
                            'A document cannot be classified above the project baseline.',
                        );
                    }
                }

                /** @var array<int, array<string, mixed>> $fileMeta */
                $fileMeta = $this->input('file_meta', []);

                foreach (array_keys($this->uploadedFiles()) as $index) {
                    $markingValue = $fileMeta[$index]['base_classification'] ?? null;

                    if (! is_string($markingValue) || $markingValue === '') {
                        continue;
                    }

                    $requested = BaseClassification::tryFrom($markingValue);

                    if ($requested !== null && ! $project->baseClassification()->dominates($requested)) {
                        $validator->errors()->add(
                            "file_meta.{$index}.base_classification",
                            'A document cannot be classified above the project baseline.',
                        );
                    }
                }
            },
        ];
    }

    /**
     * The shared default classification marking as an enum.
     */
    public function classification(): BaseClassification
    {
        return BaseClassification::from($this->validated('base_classification'));
    }

    /**
     * Per-file metadata overrides submitted alongside the upload.
     *
     * @return array<int, array{description?: string|null, base_classification?: string|null}>
     */
    public function fileMeta(): array
    {
        /** @var array<int, array<string, mixed>> $meta */
        $meta = $this->validated('file_meta') ?? [];

        return $meta;
    }

    /**
     * Resolve the description for a file, falling back to the shared default.
     */
    public function descriptionForIndex(int $index): ?string
    {
        $perFile = $this->fileMeta()[$index]['description'] ?? null;

        if (is_string($perFile) && $perFile !== '') {
            return $perFile;
        }

        $shared = $this->validated('description');

        return is_string($shared) && $shared !== '' ? $shared : null;
    }

    /**
     * Resolve the classification for a file, falling back to the shared default.
     */
    public function classificationForIndex(int $index): BaseClassification
    {
        $perFile = $this->fileMeta()[$index]['base_classification'] ?? null;

        if (is_string($perFile) && $perFile !== '') {
            return BaseClassification::from($perFile);
        }

        return $this->classification();
    }

    /**
     * All uploaded files, whether sent as a single `file` or a `files` array.
     *
     * @return array<int, UploadedFile>
     */
    public function uploadedFiles(): array
    {
        if ($this->hasFile('files')) {
            /** @var array<int, UploadedFile> $files */
            $files = $this->file('files');

            return array_values($files);
        }

        $file = $this->file('file');

        return $file instanceof UploadedFile ? [$file] : [];
    }
}
