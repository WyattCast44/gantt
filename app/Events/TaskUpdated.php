<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Task;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a task is updated. Thin by design: it carries only the
 * affected model (A10).
 */
class TaskUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Task $task) {}
}
