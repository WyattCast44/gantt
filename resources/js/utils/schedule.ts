import { formatInputDate } from '@/utils/date';

/** JavaScript weekday index: 0 = Sunday … 6 = Saturday. */
export type WorkCalendar = {
    non_working_weekdays: number[];
};

export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
    non_working_weekdays: [0, 6],
};

export type DurationUnitValue = 'calendar_days' | 'work_days';

/**
 * Independent schedule locks (max two of three may be set; two locks derive
 * the third field, fully pinning the task against automatic movement).
 */
export type ScheduleLocks = {
    lock_start: boolean;
    lock_end: boolean;
    lock_duration: boolean;
};

export function scheduleLockCount(locks: ScheduleLocks): number {
    return Number(locks.lock_start) + Number(locks.lock_end) + Number(locks.lock_duration);
}

/** Two locks fix all three schedule fields — the rules engine may never move the task. */
export function isFullyPinned(locks: ScheduleLocks): boolean {
    return scheduleLockCount(locks) >= 2;
}

/** A short human label for the active lock combination. */
export function describeScheduleLocks(locks: ScheduleLocks): string {
    if (locks.lock_start && locks.lock_end) {
        return 'Start & end locked';
    }

    if (locks.lock_start && locks.lock_duration) {
        return 'Start & duration locked';
    }

    if (locks.lock_end && locks.lock_duration) {
        return 'End & duration locked';
    }

    if (locks.lock_start) {
        return 'Start locked';
    }

    if (locks.lock_end) {
        return 'Deadline (end locked)';
    }

    return 'Duration fixed';
}

export const DURATION_UNITS: { value: DurationUnitValue; label: string }[] = [
    { value: 'work_days', label: 'Work days' },
    { value: 'calendar_days', label: 'Calendar days' },
];

/**
 * Resolve the project's work calendar, falling back to the MVP default until
 * project settings persist custom non-working days.
 */
export function resolveWorkCalendar(project?: { work_calendar?: WorkCalendar }): WorkCalendar {
    return project?.work_calendar ?? DEFAULT_WORK_CALENDAR;
}

export function isWorkingDay(date: Date, calendar: WorkCalendar): boolean {
    return !calendar.non_working_weekdays.includes(date.getDay());
}

function parseInputDate(startDate: string): Date | null {
    if (startDate === '') {
        return null;
    }

    const [year, month, day] = startDate.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

/**
 * Derive the inclusive end date for a task schedule (matches Task::endDate() on the server).
 */
export function taskEndDate(
    startDate: string,
    durationDays: number,
    unit: DurationUnitValue,
    calendar: WorkCalendar,
): string | null {
    const start = parseInputDate(startDate);

    if (start === null) {
        return null;
    }

    if (unit === 'calendar_days') {
        const end = new Date(start);
        end.setDate(end.getDate() + Math.max(0, durationDays - 1));

        return formatInputDate(end);
    }

    let current = new Date(start);
    let counted = 0;

    while (counted < durationDays) {
        if (isWorkingDay(current, calendar)) {
            counted++;

            if (counted === durationDays) {
                return formatInputDate(current);
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return formatInputDate(current);
}

/**
 * Derive the inclusive start date when duration and end are known (inverse of
 * {@link taskEndDate}).
 */
export function taskStartDate(
    endDate: string,
    durationDays: number,
    unit: DurationUnitValue,
    calendar: WorkCalendar,
): string | null {
    const end = parseInputDate(endDate);

    if (end === null || durationDays < 1) {
        return null;
    }

    if (unit === 'calendar_days') {
        const start = new Date(end);
        start.setDate(start.getDate() - (durationDays - 1));

        return formatInputDate(start);
    }

    let current = new Date(end);
    let counted = 0;

    while (counted < durationDays) {
        if (isWorkingDay(current, calendar)) {
            counted++;

            if (counted === durationDays) {
                return formatInputDate(current);
            }
        }

        current.setDate(current.getDate() - 1);
    }

    return formatInputDate(current);
}

/**
 * Derive inclusive duration from a start/end pair (inverse of {@link taskEndDate}).
 */
export function taskDurationFromDates(
    startDate: string,
    endDate: string,
    unit: DurationUnitValue,
    calendar: WorkCalendar,
): number | null {
    const start = parseInputDate(startDate);
    const end = parseInputDate(endDate);

    if (start === null || end === null || end < start) {
        return null;
    }

    if (unit === 'calendar_days') {
        const difference = Math.round((end.getTime() - start.getTime()) / 86_400_000);

        return difference + 1;
    }

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
        if (isWorkingDay(current, calendar)) {
            count += 1;
        }

        current.setDate(current.getDate() + 1);
    }

    return count > 0 ? count : null;
}
