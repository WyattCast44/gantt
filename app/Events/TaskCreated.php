<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Task;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * The generic domain-event bus (deferred since Phase 3). Thin by design: it
 * carries only the affected model (A10). Future notification-delivery listeners
 * subscribe here without touching the dispatch site.
 */
class TaskCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Task $task) {}
}
