import TaskBarTooltip from '@/Pages/Timeline/Partials/TaskBarTooltip';
import { barPalette, riskStripeClass } from '@/Pages/Timeline/Partials/barAppearance';
import { type Task } from '@/types';
import { BAR_HEIGHT, ROW_HEIGHT, type BarMetrics } from '@/utils/gantt';
import { cn } from '@/utils/cn';
import { describeScheduleLocks, isFullyPinned } from '@/utils/schedule';
import { Lock, TriangleAlert } from 'lucide-react';
import { type PointerEvent } from 'react';

type TaskBarProps = {
    task: Task;
    bar: BarMetrics;
    /** Editors can drag the bar to reschedule. */
    interactive?: boolean;
    /** True while this bar is the one being dragged (live preview). */
    dragging?: boolean;
    onMoveStart?: (event: PointerEvent) => void;
    onResizeStart?: (event: PointerEvent) => void;
};

const VERTICAL_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

/**
 * A single task bar positioned at the store-computed integer pixels (A11). It
 * reads coordinates, it does not compute them. Visual indicators: status fill,
 * percent-complete progress, a left risk stripe, the organization tag, and a
 * manual-lock icon. Editors can drag the body (move) or the right edge (resize).
 */
export default function TaskBar({ task, bar, interactive = false, dragging = false, onMoveStart, onResizeStart }: TaskBarProps) {
    const palette = barPalette(task.status.value);
    const percent = Math.max(0, Math.min(100, task.percent_complete));

    return (
        <>
            <TaskBarTooltip
                task={task}
                disabled={dragging}
                style={{ left: bar.x, width: bar.width, top: VERTICAL_PADDING, height: BAR_HEIGHT }}
            >
                <div
                    data-testid={`task-bar-${task.id}`}
                    className={cn(
                        'relative flex h-full w-full items-center overflow-hidden rounded-sm select-none',
                        palette.track,
                        palette.border,
                        riskStripeClass(task.risk_level.value),
                        interactive && (dragging ? 'cursor-grabbing ring-2 ring-accent-400' : 'cursor-grab'),
                    )}
                    onPointerDown={interactive ? onMoveStart : undefined}
                >
                    {percent > 0 && <div className={cn('absolute inset-y-0 left-0', palette.fill)} style={{ width: `${percent}%` }} aria-hidden />}

                    <span className={cn('relative min-w-0 flex-1 truncate px-2 text-xs font-medium', palette.text)}>{task.name}</span>

                    {(task.schedule_conflicts?.length ?? 0) > 0 && (
                        <TriangleAlert
                            data-testid="schedule-conflict-badge"
                            className="relative mr-1 h-3 w-3 shrink-0 text-red-600 dark:text-red-400"
                            aria-label="Schedule conflict"
                        />
                    )}

                    {(task.lock_start || task.lock_end) && (
                        <Lock
                            className={cn('relative mr-1 h-3 w-3 shrink-0', palette.text, !isFullyPinned(task) && 'opacity-50')}
                            aria-label={describeScheduleLocks(task)}
                        />
                    )}

                    {interactive && (
                        <span
                            role="separator"
                            aria-label="Resize duration"
                            onPointerDown={onResizeStart}
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                        />
                    )}
                </div>
            </TaskBarTooltip>

            {task.organization !== null && task.organization !== '' && (
                <span
                    className="pointer-events-none absolute truncate text-[11px] text-slate-400 dark:text-neutral-500"
                    style={{ left: bar.x + bar.width + 6, top: VERTICAL_PADDING, maxWidth: 160, lineHeight: `${BAR_HEIGHT}px` }}
                >
                    {task.organization}
                </span>
            )}
        </>
    );
}
