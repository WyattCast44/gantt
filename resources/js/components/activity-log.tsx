import Avatar from '@/components/ui/avatar';
import Badge from '@/components/ui/badge';
import Card from '@/components/ui/card';
import { type Activity } from '@/types';
import { formatDateTime, formatRelativeDate } from '@/utils/date';
import { History } from 'lucide-react';

/**
 * Newest entries rendered before the trail is truncated. Mirrors
 * `ActivityResource::RECENT_LIMIT` on the backend, which sends one extra row so
 * a longer-than-this list can be flagged without a separate count query.
 */
const VISIBLE_LIMIT = 50;

/** Human-readable label for an activity event (attribute changes + actions). */
const EVENT_LABELS: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    downloaded: 'Downloaded',
    previewed: 'Previewed',
    exported: 'Exported',
    attached: 'Attached',
    detached: 'Detached',
    dependency_added: 'Dependency added',
    dependency_removed: 'Dependency removed',
};

/** Render an arbitrary logged value compactly for the diff display. */
function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function ChangeDiff({ activity }: { activity: Activity }) {
    const changes = activity.attribute_changes;

    if (!changes) {
        return null;
    }

    // Union of keys across both sides so created (no `old`) and deleted (no
    // `attributes`) entries still render every touched field.
    const keys = Array.from(
        new Set([...Object.keys(changes.attributes ?? {}), ...Object.keys(changes.old ?? {})]),
    );

    if (keys.length === 0) {
        return null;
    }

    return (
        <dl className="mt-2 flex flex-col gap-1">
            {keys.map((key) => {
                const next = changes.attributes?.[key];
                const previous = changes.old?.[key];
                const hasPrevious = changes.old !== undefined && key in (changes.old ?? {});
                const hasNext = changes.attributes !== undefined && key in (changes.attributes ?? {});

                return (
                    <div key={key} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                        <dt className="font-mono text-slate-500 dark:text-neutral-400">{key}</dt>
                        <dd className="min-w-0 text-slate-700 dark:text-neutral-200">
                            {hasPrevious && (
                                <span className="text-slate-400 line-through dark:text-neutral-500">
                                    {formatValue(previous)}
                                </span>
                            )}
                            {hasPrevious && hasNext && <span className="px-1 text-slate-400">→</span>}
                            {hasNext && <span className="font-medium">{formatValue(next)}</span>}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}

function ContextList({ properties }: { properties: Record<string, unknown> | null }) {
    const entries = properties ? Object.entries(properties) : [];

    if (entries.length === 0) {
        return null;
    }

    return (
        <dl className="mt-2 flex flex-col gap-1">
            {entries.map(([key, value]) => (
                <div key={key} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <dt className="font-mono text-slate-500 dark:text-neutral-400">{key}</dt>
                    <dd className="min-w-0 text-slate-700 dark:text-neutral-200">{formatValue(value)}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * The append-only audit trail (PRD §9) for a subject, newest first. Reused on
 * the document show page and the project settings page; takes a plain list of
 * ActivityResource entries.
 */
export default function ActivityLog({ activities }: { activities: Activity[] }) {
    if (activities.length === 0) {
        return (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
                <History className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                <p className="text-sm text-slate-600 dark:text-neutral-400">No activity recorded yet.</p>
            </Card>
        );
    }

    // The backend sends one row past the cap so we can flag older entries
    // without a count query; never render that probe row.
    const hasMore = activities.length > VISIBLE_LIMIT;
    const visible = hasMore ? activities.slice(0, VISIBLE_LIMIT) : activities;

    return (
        <Card padding="none">
            <ol>
                {visible.map((activity) => {
                    const causerName = activity.causer?.name ?? 'System';

                    return (
                        <li
                            key={activity.id}
                            className="flex gap-3 border-b border-border px-4 py-3 last:border-0 dark:border-border-dark"
                        >
                            <Avatar name={causerName} className="mt-0.5 h-7 w-7 shrink-0 text-[11px]" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {causerName}
                                    </span>
                                    <Badge>{EVENT_LABELS[activity.event ?? ''] ?? activity.event ?? 'Changed'}</Badge>
                                    <span
                                        className="text-xs text-slate-400 dark:text-neutral-500"
                                        title={formatDateTime(activity.created_at)}
                                    >
                                        {formatRelativeDate(activity.created_at)}
                                    </span>
                                </div>
                                <ChangeDiff activity={activity} />
                                <ContextList properties={activity.properties} />
                            </div>
                        </li>
                    );
                })}
            </ol>
            {hasMore && (
                <p className="border-t border-border px-4 py-3 text-center text-xs text-slate-500 dark:border-border-dark dark:text-neutral-400">
                    Showing the {VISIBLE_LIMIT} most recent activities.
                </p>
            )}
        </Card>
    );
}
