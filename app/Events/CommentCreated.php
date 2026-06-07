<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Comment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Retrofits comments onto the generic domain-event bus. Thin by design: it
 * carries only the affected model (A10).
 */
class CommentCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Comment $comment) {}
}
