<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ActivityAction;
use App\Http\Requests\StoreDocumentRequest;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class UploadTaskDocumentController
{
    /**
     * Upload one or more files to the project and attach them to the task in a
     * single step. Reuses the document upload request/validation and the shared
     * Document::storeUploadedFile model method.
     */
    public function __invoke(StoreDocumentRequest $request, Project $project, Task $task): RedirectResponse
    {
        $files = $request->uploadedFiles();
        $singleUpload = count($files) === 1;
        $sharedName = $request->validated('name');

        foreach ($files as $index => $file) {
            $document = Document::storeUploadedFile(
                $project,
                $file,
                $singleUpload && is_string($sharedName) ? $sharedName : null,
                $request->descriptionForIndex($index),
                $request->classificationForIndex($index),
            );

            $task->documents()->attach($document->id);
            $task->logAction(ActivityAction::Attached, ['document' => $document->name]);
        }

        $count = count($files);

        return redirect()->back()->with(
            'status',
            $count === 1 ? 'Document uploaded and attached.' : "{$count} documents uploaded and attached.",
        );
    }
}
