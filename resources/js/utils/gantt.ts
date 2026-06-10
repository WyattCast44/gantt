/**
 * Gantt geometry — the single source of the rigid, integer-pixel grid the
 * timeline is built on (A9). Column widths, row heights, and bar positions are
 * mathematical steps off these constants, so geometric containment and interval
 * intersection are cheap to compute without runtime CSS layout (A11).
 *
 * The date↔pixel helpers are pure functions so the Zustand layout engine
 * (Phase 7.2) and its unit tests can share them, and so future date propagation
 * can mutate bar positions through the same math without retrofitting.
 */

/** Time-scale zoom levels (PRD: day / month / quarter / year). */
export type ZoomLevel = 'day' | 'month' | 'quarter' | 'year';

export const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'month', 'quarter', 'year'] as const;

type ZoomConfig = {
    /** Integer pixels per calendar day at this zoom. */
    readonly dayWidth: number;
    /**
     * Deepest hierarchy level (1–5) shown at this zoom. Zooming out folds the
     * deeper tiers away so only higher-level parents remain (slippy-map LOD,
     * FR-15). The actual pruning lives in the store; this is the threshold.
     */
    readonly maxDepth: number;
    readonly label: string;
};

export const ZOOM_CONFIG: Record<ZoomLevel, ZoomConfig> = {
    day: { dayWidth: 40, maxDepth: 5, label: 'Day' },
    month: { dayWidth: 8, maxDepth: 4, label: 'Month' },
    quarter: { dayWidth: 3, maxDepth: 3, label: 'Quarter' },
    year: { dayWidth: 1, maxDepth: 2, label: 'Year' },
};

/** Vertical step for every Gantt row (left tree pane and timeline body align). */
export const ROW_HEIGHT = 36;

/** Bar height inside a row; the remainder is symmetric vertical padding. */
export const BAR_HEIGHT = 20;

/** Two-tier time-axis header height (primary + secondary + tertiary ticks). */
export const HEADER_HEIGHT = 84;

/** Fixed width of the left task-name tree pane. */
export const LEFT_PANE_WIDTH = 320;

/** Indentation step per hierarchy level in the left tree pane. */
export const INDENT_STEP = 16;

/** Floor on bar width so a single short task stays clickable when zoomed out. */
export const MIN_BAR_WIDTH = 4;

const MS_PER_DAY = 86_400_000;

/**
 * Parse a `YYYY-MM-DD` date string to a UTC-midnight Date, avoiding local
 * timezone drift (day-grain scheduling only — A5).
 */
export function parseDay(iso: string): Date {
    return new Date(`${iso}T00:00:00Z`);
}

/** Whole calendar days from `origin` to `date` (negative if before origin). */
export function dayOffset(date: Date, origin: Date): number {
    return Math.round((date.getTime() - origin.getTime()) / MS_PER_DAY);
}

/** Shift a `YYYY-MM-DD` date by a whole number of days (used by drag-reschedule). */
export function addDays(iso: string, days: number): string {
    return new Date(parseDay(iso).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Monday-start week containing `iso` (YYYY-MM-DD, UTC day grain). */
export function startOfWeek(iso: string): string {
    const weekday = parseDay(iso).getUTCDay();

    return addDays(iso, -((weekday + 6) % 7));
}

/** Sunday ending the Monday-start week containing `iso`. */
export function endOfWeek(iso: string): string {
    return addDays(startOfWeek(iso), 6);
}

/** Whole calendar days spanned inclusively between two dates (>= 1). */
export function inclusiveDaySpan(startIso: string, endIso: string): number {
    return Math.max(1, dayOffset(parseDay(endIso), parseDay(startIso)) + 1);
}

/** Total grid width in pixels for a date range at a given zoom. */
export function timelineWidth(rangeStartIso: string, rangeEndIso: string, zoom: ZoomLevel): number {
    return inclusiveDaySpan(rangeStartIso, rangeEndIso) * ZOOM_CONFIG[zoom].dayWidth;
}

export type BarMetrics = {
    /** Left edge in integer pixels from the timeline origin. */
    readonly x: number;
    /** Bar width in integer pixels (>= MIN_BAR_WIDTH). */
    readonly width: number;
};

/**
 * Compute a task bar's pixel position from its dates. Returns `null` when the
 * task has no start date (unscheduled tasks render in the tree pane only).
 */
export function barMetrics(
    startIso: string | null,
    endIso: string | null,
    rangeStartIso: string,
    zoom: ZoomLevel,
): BarMetrics | null {
    if (startIso === null) {
        return null;
    }

    const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
    const origin = parseDay(rangeStartIso);
    const x = dayOffset(parseDay(startIso), origin) * dayWidth;
    const days = endIso === null ? 1 : inclusiveDaySpan(startIso, endIso);

    return { x, width: Math.max(MIN_BAR_WIDTH, days * dayWidth) };
}
