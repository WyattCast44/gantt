import { formatInputDate } from '@/utils/date';

/** JavaScript weekday index: 0 = Sunday … 6 = Saturday. */
export type WorkCalendar = {
    non_working_weekdays: number[];
};

export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
    non_working_weekdays: [0, 6],
};

export type DurationUnitValue = 'calendar_days' | 'work_days';

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
