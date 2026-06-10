import { type RiskLevelValue, type Task, type TaskStatusValue } from '@/types';

type BarPalette = {
    /** Bar background (the uncompleted portion). */
    track: string;
    /** Completed-portion fill (percent_complete). */
    fill: string;
    /** Label text colour over the bar. */
    text: string;
    /** Thin outline matching the status badge border tones. */
    border: string;
};

/** Solid bar colours per task status (distinct from the lighter Badge tones). */
const STATUS_PALETTE: Record<TaskStatusValue, BarPalette> = {
    not_started: {
        track: 'bg-slate-200 dark:bg-neutral-700',
        fill: 'bg-slate-400 dark:bg-neutral-500',
        text: 'text-slate-800 dark:text-neutral-100',
        border: 'border border-slate-300 dark:border-neutral-600',
    },
    in_progress: {
        track: 'bg-accent-500/25',
        fill: 'bg-accent-500',
        text: 'text-slate-800 dark:text-neutral-100',
        border: 'border border-accent-300 dark:border-accent-500/30',
    },
    blocked: {
        track: 'bg-red-500/20',
        fill: 'bg-red-500',
        text: 'text-slate-800 dark:text-neutral-100',
        border: 'border border-red-300 dark:border-red-500/30',
    },
    complete: {
        track: 'bg-emerald-500/25',
        fill: 'bg-emerald-500',
        text: 'text-slate-800 dark:text-neutral-100',
        border: 'border border-emerald-300 dark:border-emerald-500/30',
    },
};

export function barPalette(status: TaskStatusValue): BarPalette {
    return STATUS_PALETTE[status];
}

/** Weekend column backgrounds — warm stone gray, distinct from cool slate status bar tracks. */
export const weekendBandClass = 'bg-stone-200 dark:bg-stone-800/50';

export const weekendAxisSegmentClass =
    'bg-stone-200 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400';

/** Left risk stripe: thicker/redder as risk rises (low is a hairline). */
export function riskStripeClass(risk: RiskLevelValue): string {
    return {
        low: 'border-l-2 border-slate-300 dark:border-neutral-600',
        medium: 'border-l-4 border-amber-400',
        high: 'border-l-4 border-red-600',
    }[risk];
}

/** Structured task-bar hover details for the timeline tooltip. */
export type BarSummaryRow = {
    label: string;
    value: string;
};

export function barSummaryRows(task: Task): { title: string; rows: BarSummaryRow[] } {
    const rows: BarSummaryRow[] = [
        { label: 'Status', value: task.status.label },
        { label: 'Risk', value: task.risk_level.label },
    ];

    if (task.start_date !== null) {
        const span =
            task.end_date !== null && task.end_date !== task.start_date ? `${task.start_date} → ${task.end_date}` : task.start_date;

        rows.push({ label: 'Dates', value: span });
        rows.push({ label: 'Duration', value: `${task.duration_days} ${task.duration_unit.label}` });
    }

    rows.push({ label: 'Progress', value: `${task.percent_complete}% complete` });

    if (task.organization !== null && task.organization !== '') {
        rows.push({ label: 'Organization', value: task.organization });
    }

    if (task.is_date_locked) {
        rows.push({ label: 'Schedule', value: 'Dates locked' });
    }

    return { title: task.name, rows };
}
