const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: 'seconds' },
    { amount: 60, unit: 'minutes' },
    { amount: 24, unit: 'hours' },
    { amount: 7, unit: 'days' },
    { amount: 4.34524, unit: 'weeks' },
    { amount: 12, unit: 'months' },
    { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** Format a local Date as YYYY-MM-DD for HTML date inputs. */
export function formatInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/** Today's date in YYYY-MM-DD for HTML date inputs (local timezone). */
export function todayInputDate(): string {
    return formatInputDate(new Date());
}

/**
 * Format a YYYY-MM-DD date as "Monday, 13 June 2027".
 * Returns null when the input is blank or invalid.
 */
export function formatLongDateFromInput(dateInput: string): string | null {
    if (dateInput === '') {
        return null;
    }

    const [year, month, day] = dateInput.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(year, month - 1, day);
    const parts = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).formatToParts(date);

    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';

    return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`;
}

/** e.g. "3 days ago", "in 2 hours" */
export function formatRelativeDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    let duration = (new Date(iso).getTime() - Date.now()) / 1000;

    for (const division of DIVISIONS) {
        if (Math.abs(duration) < division.amount) {
            return relativeTimeFormatter.format(Math.round(duration), division.unit);
        }

        duration /= division.amount;
    }

    return '—';
}

/** Locale-aware full date and time for tooltips. */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    return new Date(iso).toLocaleString();
}
