<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class CommentController
{
    use AuthorizesRequests;

    /**
     * Add a comment to a document.
     */
    public function store(StoreCommentRequest $request, Project $project, Document $document): RedirectResponse
    {
        $document->comments()->create([
            'body' => $request->validated('body'),
            'base_classification' => $request->classification(),
        ]);

        return redirect()->back()->with('status', 'Comment added.');
    }

    /**
     * Update the author's own comment.
     */
    public function update(UpdateCommentRequest $request, Project $project, Document $document, Comment $comment): RedirectResponse
    {
        $comment->update([
            'body' => $request->validated('body'),
            'base_classification' => $request->classification(),
        ]);

        return redirect()->back()->with('status', 'Comment updated.');
    }

    /**
     * Delete a comment (author, or an owner/admin moderating).
     */
    public function destroy(Project $project, Document $document, Comment $comment): RedirectResponse
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return redirect()->back()->with('status', 'Comment deleted.');
    }
}
