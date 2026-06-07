import { type BadgeTone } from '@/components/ui/badge';
import { type RiskLevelValue, type Task, type TaskStatusValue } from '@/types';

/** Badge tone for a task status. */
export function statusTone(status: TaskStatusValue): BadgeTone {
    return {
        not_started: 'neutral',
        in_progress: 'accent',
        blocked: 'danger',
        complete: 'success',
    }[status] as BadgeTone;
}

/** Hover tooltip explaining a task status badge. */
export function statusTooltip(status: TaskStatusValue): string {
    const descriptions: Record<TaskStatusValue, string> = {
        not_started: 'Work has not started yet',
        in_progress: 'Work is currently underway',
        blocked: 'Blocked by a dependency or issue',
        complete: 'All work on this task is finished',
    };

    return `Status — ${descriptions[status]}`;
}

/** Badge tone for a risk level. */
export function riskTone(risk: RiskLevelValue): BadgeTone {
    return {
        low: 'neutral',
        medium: 'warning',
        high: 'danger',
    }[risk] as BadgeTone;
}

/** Hover tooltip explaining a risk level badge. */
export function riskTooltip(risk: RiskLevelValue): string {
    const descriptions: Record<RiskLevelValue, string> = {
        low: 'Unlikely to affect the schedule',
        medium: 'May cause delays if not managed',
        high: 'Significant threat to schedule or mission',
    };

    return `Risk level — ${descriptions[risk]}`;
}

/** Flatten a task tree into a depth-first list (used for parent pickers, etc.). */
export function flattenTasks(tasks: Task[]): Task[] {
    return tasks.flatMap((task) => [task, ...flattenTasks(task.children ?? [])]);
}

/** Whether a task has any descendant that is not complete. */
export function hasIncompleteSubtasks(task: Task): boolean {
    return (task.children ?? []).some(
        (child) => child.status.value !== 'complete' || hasIncompleteSubtasks(child),
    );
}

/** Count incomplete descendants (excluding the task itself). */
export function countIncompleteSubtasks(task: Task): number {
    return (task.children ?? []).reduce(
        (count, child) =>
            count +
            (child.status.value !== 'complete' ? 1 : 0) +
            countIncompleteSubtasks(child),
        0,
    );
}
