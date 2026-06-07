<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ActivityAction;
use App\Http\Requests\StoreTaskDocumentRequest;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class TaskDocumentController
{
    use AuthorizesRequests;

    /**
     * Attach an existing project document to a task.
     */
    public function store(StoreTaskDocumentRequest $request, Project $project, Task $task): RedirectResponse
    {
        $document = $request->document();

        $task->documents()->attach($document->id);
        $task->logAction(ActivityAction::Attached, ['document' => $document->name]);

        return redirect()->back()->with('status', 'Document attached.');
    }

    /**
     * Detach a document from a task (the document itself is left intact).
     */
    public function destroy(Project $project, Task $task, Document $document): RedirectResponse
    {
        $this->authorize('update', $project);

        $task->documents()->detach($document->id);
        $task->logAction(ActivityAction::Detached, ['document' => $document->name]);

        return redirect()->back()->with('status', 'Document detached.');
    }
}
