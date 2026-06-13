/**
 * Pure time-axis tick generator. Given the timeline date range and zoom, it
 * produces three banded tiers of segments with integer-pixel x/width, adapting
 * the calendar units to the zoom so the header stays legible at every scale.
 */

import { dayOffset, parseDay, ZOOM_CONFIG, type ZoomLevel } from './gantt';

export type AxisSegment = {
    readonly key: string;
    readonly label: string;
    /** Left edge in integer pixels from the timeline origin. */
    readonly x: number;
    /** Segment width in integer pixels. */
    readonly width: number;
    /** True for Saturday/Sunday day-cells (day zoom only). */
    readonly weekend: boolean;
};

export type GanttAxis = {
    readonly primary: AxisSegment[];
    readonly secondary: AxisSegment[];
    readonly tertiary: AxisSegment[];
};

type CalendarUnit = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'weekday' | 'fiscal_year';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Monday-first single-letter weekday labels. */
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** The {tertiary, secondary, primary} calendar units rendered at each zoom. */
const AXIS_UNITS: Record<ZoomLevel, { tertiary: CalendarUnit; secondary: CalendarUnit; primary: CalendarUnit }> = {
    day: { tertiary: 'day', secondary: 'weekday', primary: 'month' },
    week: { tertiary: 'weekday', secondary: 'week', primary: 'month' },
    month: { tertiary: 'month', secondary: 'year', primary: 'fiscal_year' },
    quarter: { tertiary: 'month', secondary: 'quarter', primary: 'fiscal_year' },
    year: { tertiary: 'quarter', secondary: 'year', primary: 'fiscal_year' },
};

function quarterOf(date: Date): number {
    return Math.floor(date.getUTCMonth() / 3) + 1;
}

/** Monday (UTC midnight) of the week containing `date`. */
function mondayOf(date: Date): Date {
    return new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86_400_000);
}

/** US federal FY: Oct 1 – Sep 30, labeled by the calendar year in which it ends. */
function fiscalYearEnd(date: Date): number {
    return date.getUTCMonth() >= 9 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
}

function weekdayLetter(date: Date): string {
    return WEEKDAY_LETTERS[(date.getUTCDay() + 6) % 7];
}

function isWeekend(date: Date): boolean {
    const day = date.getUTCDay();

    return day === 0 || day === 6;
}

/** A stable key identifying which segment a date falls in for a given unit. */
function unitKey(date: Date, unit: CalendarUnit): string {
    const y = date.getUTCFullYear();

    switch (unit) {
        case 'day':
        case 'weekday':
            return date.toISOString().slice(0, 10);
        case 'week':
            return mondayOf(date).toISOString().slice(0, 10);
        case 'month':
            return `${y}-${date.getUTCMonth()}`;
        case 'quarter':
            return `${y}-Q${quarterOf(date)}`;
        case 'year':
            return `${y}`;
        case 'fiscal_year':
            return `FY${fiscalYearEnd(date)}`;
    }
}

function unitLabel(date: Date, unit: CalendarUnit, role: 'primary' | 'secondary' | 'tertiary'): string {
    const y = date.getUTCFullYear();

    switch (unit) {
        case 'day':
            return String(date.getUTCDate());
        case 'weekday':
            return weekdayLetter(date);
        case 'week': {
            const monday = mondayOf(date);

            return `${MONTHS[monday.getUTCMonth()]} ${monday.getUTCDate()}`;
        }
        case 'month':
            return role === 'primary' ? `${MONTHS[date.getUTCMonth()]} ${y}` : MONTHS[date.getUTCMonth()];
        case 'quarter':
            if (role === 'primary') {
                return `Q${quarterOf(date)} ${y}`;
            }

            if (role === 'secondary') {
                return `Q${quarterOf(date)} / ${y}`;
            }

            return `Q${quarterOf(date)}`;
        case 'year':
            return String(y);
        case 'fiscal_year':
            return `FY${String(fiscalYearEnd(date)).slice(-2)}`;
    }
}

/**
 * Walk the range day by day, closing a segment whenever the unit key changes.
 * Segments are clipped to the range (partial months/quarters at the edges keep
 * their true pixel width).
 */
function buildBand(rangeStart: string, rangeEnd: string, unit: CalendarUnit, dayWidth: number, role: 'primary' | 'secondary' | 'tertiary'): AxisSegment[] {
    const origin = parseDay(rangeStart);
    const lastOffset = dayOffset(parseDay(rangeEnd), origin);
    const segments: AxisSegment[] = [];

    let currentKey: string | null = null;
    let startOffset = 0;

    const close = (endOffset: number, date: Date, key: string): void => {
        segments.push({
            key,
            label: unitLabel(date, unit, role),
            x: startOffset * dayWidth,
            width: (endOffset - startOffset + 1) * dayWidth,
            weekend: (unit === 'day' || unit === 'weekday') && isWeekend(date),
        });
    };

    let segmentDate = origin;

    for (let offset = 0; offset <= lastOffset; offset += 1) {
        const date = new Date(origin.getTime() + offset * 86_400_000);
        const key = unitKey(date, unit);

        if (key !== currentKey) {
            if (currentKey !== null) {
                close(offset - 1, segmentDate, currentKey);
            }
            currentKey = key;
            startOffset = offset;
            segmentDate = date;
        }
    }

    if (currentKey !== null) {
        close(lastOffset, segmentDate, currentKey);
    }

    return segments;
}

export function buildAxis(rangeStart: string, rangeEnd: string, zoom: ZoomLevel): GanttAxis {
    const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
    const { primary, secondary, tertiary } = AXIS_UNITS[zoom];

    return {
        primary: buildBand(rangeStart, rangeEnd, primary, dayWidth, 'primary'),
        secondary: buildBand(rangeStart, rangeEnd, secondary, dayWidth, 'secondary'),
        tertiary: buildBand(rangeStart, rangeEnd, tertiary, dayWidth, 'tertiary'),
    };
}
