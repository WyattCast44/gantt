<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\ProjectResource;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController
{
    use AuthorizesRequests;

    /**
     * List the project's documents.
     */
    public function index(Project $project): Response
    {
        return Inertia::render('Documents/Index', [
            'project' => new ProjectResource($project),
            'documents' => DocumentResource::collection(
                $project->documents()->with('creator')->latest()->get()
            ),
        ]);
    }

    /**
     * Show a single document with its preview and metadata.
     */
    public function show(Project $project, Document $document): Response
    {
        // Set the relations the CommentPolicy walks (commentable -> project) from
        // the models already in hand, so authorization does not trigger queries
        // or lazy-loading violations per comment.
        $document->setRelation('project', $project);

        $document->load([
            'creator',
            'comments' => fn ($query) => $query->with('creator')->latest(),
            // Append-only audit trail (PRD §9), newest first, capped to a recent
            // window (+1 row to flag older entries exist); eager-load the causer
            // so the resource never lazy-loads under shouldBeStrict().
            'activitiesAsSubject' => fn ($query) => $query->with('causer')->latest()
                ->limit(ActivityResource::RECENT_LIMIT + 1),
        ]);

        $document->comments->each(
            fn (Comment $comment) => $comment->setRelation('commentable', $document),
        );

        return Inertia::render('Documents/Show', [
            'project' => new ProjectResource($project),
            'document' => new DocumentResource($document),
        ]);
    }

    /**
     * Upload one or more documents to the project.
     */
    public function store(StoreDocumentRequest $request, Project $project): RedirectResponse
    {
        $files = $request->uploadedFiles();
        $singleUpload = count($files) === 1;
        $sharedName = $request->validated('name');

        foreach ($files as $index => $file) {
            Document::storeUploadedFile(
                $project,
                $file,
                $singleUpload && is_string($sharedName) ? $sharedName : null,
                $request->descriptionForIndex($index),
                $request->classificationForIndex($index),
            );
        }

        $count = count($files);

        return redirect()->back()->with(
            'status',
            $count === 1 ? 'Document uploaded.' : "{$count} documents uploaded.",
        );
    }

    /**
     * Update a document's metadata.
     */
    public function update(UpdateDocumentRequest $request, Project $project, Document $document): RedirectResponse
    {
        $document->update($request->validated());

        return redirect()->back()->with('status', 'Document updated.');
    }

    /**
     * Delete a document and its underlying file.
     */
    public function destroy(Project $project, Document $document): RedirectResponse
    {
        $this->authorize('update', $project);

        $document->deleteWithFile();

        // Redirect to the index rather than back() so deleting from the show
        // page (whose URL now 404s) lands somewhere valid.
        return redirect()
            ->route('projects.documents.index', $project)
            ->with('status', 'Document deleted.');
    }
}
