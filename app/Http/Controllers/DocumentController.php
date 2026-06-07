<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\ProjectResource;
use App\Models\Document;
use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
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
        return Inertia::render('Documents/Show', [
            'project' => new ProjectResource($project),
            'document' => new DocumentResource($document->load('creator')),
        ]);
    }

    /**
     * Upload one or more documents to the project.
     */
    public function store(StoreDocumentRequest $request, Project $project): RedirectResponse
    {
        $files = $request->uploadedFiles();
        $singleUpload = count($files) === 1;

        foreach ($files as $index => $file) {
            $this->persistUploadedFile($project, $file, $request, $singleUpload, $index);
        }

        $count = count($files);

        return redirect()->back()->with(
            'status',
            $count === 1 ? 'Document uploaded.' : "{$count} documents uploaded.",
        );
    }

    /**
     * Store a single uploaded file as a project document.
     */
    private function persistUploadedFile(
        Project $project,
        UploadedFile $file,
        StoreDocumentRequest $request,
        bool $useCustomName,
        int $index,
    ): void {
        $path = $file->store((string) $project->id, Document::DISK);

        $document = new Document([
            'name' => $useCustomName && $request->validated('name')
                ? $request->validated('name')
                : $file->getClientOriginalName(),
            'description' => $request->descriptionForIndex($index),
            'base_classification' => $request->classificationForIndex($index),
        ]);

        // Storage metadata is derived server-side; it is not in the model's
        // #[Fillable] set, so it is set explicitly rather than mass-assigned.
        $document->disk = Document::DISK;
        $document->path = $path;
        $document->original_filename = $file->getClientOriginalName();
        $document->mime_type = $file->getMimeType();
        $document->size_bytes = $file->getSize();
        $document->checksum = hash_file('sha256', $file->getRealPath());

        $project->documents()->save($document);
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
