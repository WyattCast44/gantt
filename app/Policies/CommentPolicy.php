<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Comment;
use App\Models\Document;
use App\Models\Task;
use App\Models\User;

class CommentPolicy
{
    /**
     * Owners, admins, and editors may comment on any commentable (document or
     * task), gated by their role on the commentable's project.
     */
    public function create(User $user, Document|Task $commentable): bool
    {
        return $commentable->project->roleFor($user)?->canEdit() ?? false;
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
