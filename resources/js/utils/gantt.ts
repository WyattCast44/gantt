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

/** Time-scale zoom levels (PRD: day / week / month / quarter / year). */
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter', 'year'] as const;

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
    week: { dayWidth: 16, maxDepth: 5, label: 'Week' },
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

/** Default width of the left task-name tree pane. */
export const LEFT_PANE_WIDTH_DEFAULT = 320;

/** Minimum width of the left task-name tree pane. */
export const LEFT_PANE_WIDTH_MIN = 240;

/** Maximum width of the left task-name tree pane. */
export const LEFT_PANE_WIDTH_MAX = 560;

/** Fixed width of the left task-name tree pane (legacy alias). */
export const LEFT_PANE_WIDTH = LEFT_PANE_WIDTH_DEFAULT;

/** Indentation step per hierarchy level in the left tree pane. */
export const INDENT_STEP = 16;

/** Floor on bar width so a single short task stays clickable when zoomed out. */
export const MIN_BAR_WIDTH = 4;

/** Maximum task nesting depth (mirrors Task::MAX_DEPTH server-side). */
export const MAX_TASK_DEPTH = 5;

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

/** Horizontal padding fraction when framing a task bar in the viewport. */
export const FOCUS_PADDING_RATIO = 0.15;

/** Whole calendar days spanned inclusively between two dates (>= 1). */
export function inclusiveDaySpan(startIso: string, endIso: string): number {
    return Math.max(1, dayOffset(parseDay(endIso), parseDay(startIso)) + 1);
}

/**
 * Pick the finest zoom where a task's day span fits in the bar-track viewport
 * (with padding) and the hierarchy level remains visible at that zoom.
 * Falls back to the coarsest depth-compatible zoom when the span is too long.
 */
export function zoomToFitSpan(
    spanDays: number,
    viewportWidth: number,
    minDepth: number,
    paddingRatio: number = FOCUS_PADDING_RATIO,
): ZoomLevel {
    const availableWidth = Math.max(0, viewportWidth * (1 - 2 * paddingRatio));

    for (const level of ZOOM_LEVELS) {
        if (ZOOM_CONFIG[level].maxDepth >= minDepth && spanDays * ZOOM_CONFIG[level].dayWidth <= availableWidth) {
            return level;
        }
    }

    for (const level of [...ZOOM_LEVELS].reverse()) {
        if (ZOOM_CONFIG[level].maxDepth >= minDepth) {
            return level;
        }
    }

    return 'day';
}

/**
 * Horizontal scrollLeft that frames a task bar in the bar-track viewport.
 * Centers the bar when it is wider than the viewport.
 */
export function focusScrollLeft(
    barX: number,
    barWidth: number,
    trackViewport: number,
    paddingRatio: number = FOCUS_PADDING_RATIO,
): number {
    const padding = trackViewport * paddingRatio;

    if (barWidth + 2 * padding <= trackViewport) {
        return Math.max(0, barX - padding);
    }

    return Math.max(0, barX + barWidth / 2 - trackViewport / 2);
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

/**
 * Auto-scale the viewport to frame a whole date span: the finest zoom whose
 * span fits the bar-track (keeping `minDepth` rows visible), with the padded
 * range origin and the scrollLeft that frames the span. Generalizes the
 * per-task autoscale focusTask runs to an arbitrary range — used when opening a
 * scoped subtree so the entire tree lands in view. `padDays` is the headroom
 * kept before the span start (matching the store's initial range padding).
 */
export function fitToSpan(
    spanStartIso: string,
    spanEndIso: string,
    viewportWidth: number,
    minDepth: number,
    padDays: number,
): { zoom: ZoomLevel; rangeStart: string; anchorScroll: number } {
    const zoom = zoomToFitSpan(inclusiveDaySpan(spanStartIso, spanEndIso), viewportWidth, minDepth);
    const rangeStart = addDays(spanStartIso, -padDays);
    const bar = barMetrics(spanStartIso, spanEndIso, rangeStart, zoom);
    const anchorScroll = bar !== null ? focusScrollLeft(bar.x, bar.width, viewportWidth) : padDays * ZOOM_CONFIG[zoom].dayWidth;

    return { zoom, rangeStart, anchorScroll };
}
