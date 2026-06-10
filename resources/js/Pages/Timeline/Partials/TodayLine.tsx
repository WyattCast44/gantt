import { dayOffset, parseDay, ZOOM_CONFIG, type ZoomLevel } from '@/utils/gantt';
import { todayInputDate } from '@/utils/date';
import { useMemo } from 'react';

type TodayLineProps = {
    rangeStart: string;
    rangeEnd: string;
    zoom: ZoomLevel;
    height: number;
};

/**
 * Full-height vertical marker for the current calendar day. Hidden when today
 * falls outside the visible range. Sits above task bars so it stays readable.
 */
export default function TodayLine({ rangeStart, rangeEnd, zoom, height }: TodayLineProps) {
    const x = useMemo(() => {
        const today = todayInputDate();

        if (today < rangeStart || today > rangeEnd) {
            return null;
        }

        const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
        const offset = dayOffset(parseDay(today), parseDay(rangeStart));

        return offset * dayWidth + Math.floor(dayWidth / 2);
    }, [rangeStart, rangeEnd, zoom]);

    if (x === null) {
        return null;
    }

    return (
        <div
            data-testid="today-line"
            className="pointer-events-none absolute top-0 w-0 border-l-2 border-dotted border-red-500 dark:border-red-400"
            style={{ left: x, height }}
            aria-hidden
        />
    );
}
