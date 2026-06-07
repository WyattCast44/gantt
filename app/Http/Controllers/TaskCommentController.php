<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\CommentCreated;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class TaskCommentController
{
    use AuthorizesRequests;

    /**
     * Add a comment to a task.
     */
    public function store(StoreCommentRequest $request, Project $project, Task $task): RedirectResponse
    {
        $comment = $task->comments()->create([
            'body' => $request->validated('body'),
            'base_classification' => $request->classification(),
        ]);

        CommentCreated::dispatch($comment);

        return redirect()->back()->with('status', 'Comment added.');
    }

    /**
     * Update the author's own comment.
     */
    public function update(UpdateCommentRequest $request, Project $project, Task $task, Comment $comment): RedirectResponse
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
    public function destroy(Project $project, Task $task, Comment $comment): RedirectResponse
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return redirect()->back()->with('status', 'Comment deleted.');
    }
}
