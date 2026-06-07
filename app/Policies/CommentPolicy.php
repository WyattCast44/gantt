<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Comment;
use App\Models\Document;
use App\Models\User;

class CommentPolicy
{
    /**
     * Owners, admins, and editors may comment on a document.
     */
    public function create(User $user, Document $document): bool
    {
        return $document->project->roleFor($user)?->canEdit() ?? false;
    }

    /**
     * Only the author may edit their own comment.
     */
    public function update(User $user, Comment $comment): bool
    {
        return $comment->created_by === $user->id;
    }

    /**
     * The author may delete their own comment; owners and admins may delete any
     * comment in their project (moderation).
     */
    public function delete(User $user, Comment $comment): bool
    {
        if ($comment->created_by === $user->id) {
            return true;
        }

        return $comment->commentable->project->roleFor($user)?->canManageMembers() ?? false;
    }
}
