<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CommentCreated;
use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use Illuminate\Support\Facades\Log;

/**
 * The first subscriber on the generic domain-event bus built in Phase 6. It is
 * deliberately simple and synchronous (immediate): for V1 it records a
 * telemetry line so the bus is observable end-to-end. This is the seam future
 * notification-delivery listeners attach to (a later phase) without touching
 * the dispatch sites. Audit logging stays on Spatie (LogsModelActivity) — that
 * is a complementary mechanism, not this bus.
 *
 * Auto-discovered via the union-typed handle() parameter.
 */
class RecordDomainEventTelemetry
{
    public function handle(TaskCreated|TaskUpdated|CommentCreated $event): void
    {
        Log::debug('Domain event dispatched', ['event' => $event::class]);
    }
}
