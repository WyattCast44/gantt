<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Discrete user actions recorded in the audit log that don't mutate the
 * resource (so they aren't captured by the attribute-change logger). The value
 * is stored in the activity's `event` column. This is the catalog of supported
 * action verbs; only those wired to a call site are emitted today.
 */
enum ActivityAction: string
{
    case Downloaded = 'downloaded';
    case Previewed = 'previewed';
    case Exported = 'exported';
    case Attached = 'attached';
    case Detached = 'detached';
    case DependencyAdded = 'dependency_added';
    case DependencyRemoved = 'dependency_removed';
    case Reordered = 'reordered';
}
