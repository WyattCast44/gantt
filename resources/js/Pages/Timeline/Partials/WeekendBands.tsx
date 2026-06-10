import { weekendBandClass } from '@/Pages/Timeline/Partials/barAppearance';
import { dayOffset, parseDay, ZOOM_CONFIG, type ZoomLevel } from '@/utils/gantt';
import { cn } from '@/utils/cn';
import { useMemo } from 'react';

type WeekendBandsProps = {
    rangeStart: string;
    rangeEnd: string;
    zoom: ZoomLevel;
    height: number;
};

const MS_PER_DAY = 86_400_000;

/**
 * Full-height background bands shading Saturdays and Sundays. Only rendered at
 * day-level zoom, where individual days are wide enough to read; at coarser
 * zooms per-day shading would just be noise. Sits behind the bars and lines.
 */
export default function WeekendBands({ rangeStart, rangeEnd, zoom, height }: WeekendBandsProps) {
    const bands = useMemo(() => {
        if (zoom !== 'day') {
            return [];
        }

        const dayWidth = ZOOM_CONFIG.day.dayWidth;
        const origin = parseDay(rangeStart);
        const lastOffset = dayOffset(parseDay(rangeEnd), origin);
        const result: { offset: number; x: number; width: number }[] = [];

        for (let offset = 0; offset <= lastOffset; offset += 1) {
            const day = new Date(origin.getTime() + offset * MS_PER_DAY).getUTCDay();

            if (day === 0 || day === 6) {
                result.push({ offset, x: offset * dayWidth, width: dayWidth });
            }
        }

        return result;
    }, [rangeStart, rangeEnd, zoom]);

    if (bands.length === 0) {
        return null;
    }

    return (
        <div className="pointer-events-none absolute top-0 left-0" style={{ height }} aria-hidden>
            {bands.map((band) => (
                <div
                    key={band.offset}
                    className={cn('absolute top-0', weekendBandClass)}
                    style={{ left: band.x, width: band.width, height }}
                />
            ))}
        </div>
    );
}
