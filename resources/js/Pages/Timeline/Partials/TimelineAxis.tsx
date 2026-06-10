import { HEADER_HEIGHT, type ZoomLevel } from '@/utils/gantt';
import { buildAxis } from '@/utils/ganttAxis';
import { weekendAxisSegmentClass } from '@/Pages/Timeline/Partials/barAppearance';
import { cn } from '@/utils/cn';
import { useMemo } from 'react';

type TimelineAxisProps = {
    rangeStart: string;
    rangeEnd: string;
    zoom: ZoomLevel;
    width: number;
};

const BAND_HEIGHT = HEADER_HEIGHT / 3;

const fiscalYearBandClass =
    'bg-accent-50/60 text-xs font-semibold text-accent-800 dark:bg-accent-500/10 dark:text-accent-300';

/**
 * Three-tier time-axis header. Day zoom: month → weekday → date. Coarser zooms
 * lead with fiscal year, then calendar-year context, then the finest tick tier.
 */
export default function TimelineAxis({ rangeStart, rangeEnd, zoom, width }: TimelineAxisProps) {
    const axis = useMemo(() => buildAxis(rangeStart, rangeEnd, zoom), [rangeStart, rangeEnd, zoom]);
    const isDayZoom = zoom === 'day';

    return (
        <div
            className="relative shrink-0 bg-neutral-50 dark:bg-neutral-900"
            style={{ width, height: HEADER_HEIGHT }}
        >
            <div className="relative" data-testid={isDayZoom ? undefined : 'axis-fiscal-year'} style={{ height: BAND_HEIGHT }}>
                {axis.primary.map((segment) => (
                    <div
                        key={segment.key}
                        data-axis-segment
                        className={cn(
                            'absolute flex items-center border-r border-b border-border px-2 dark:border-border-dark',
                            isDayZoom
                                ? 'text-xs font-semibold text-slate-600 dark:text-neutral-300'
                                : fiscalYearBandClass,
                        )}
                        style={{ left: segment.x, width: segment.width, height: BAND_HEIGHT }}
                    >
                        <span className="sticky left-2 truncate">{segment.label}</span>
                    </div>
                ))}
            </div>

            <div className="relative" style={{ height: BAND_HEIGHT }}>
                {axis.secondary.map((segment) => (
                    <div
                        key={segment.key}
                        data-axis-segment
                        className={cn(
                            'absolute flex items-center justify-center border-r border-b border-border text-[11px] text-slate-500 dark:border-border-dark dark:text-neutral-400',
                            isDayZoom && segment.weekend && weekendAxisSegmentClass,
                        )}
                        style={{ left: segment.x, width: segment.width, height: BAND_HEIGHT }}
                    >
                        <span className="truncate px-1">{segment.label}</span>
                    </div>
                ))}
            </div>

            <div className="relative" data-testid={isDayZoom ? 'axis-tertiary' : undefined} style={{ height: BAND_HEIGHT }}>
                {axis.tertiary.map((segment) => (
                    <div
                        key={segment.key}
                        data-axis-segment
                        className={cn(
                            'absolute flex items-center justify-center border-r border-b border-border text-[11px] dark:border-border-dark',
                            isDayZoom
                                ? cn('text-slate-500 dark:text-neutral-400', segment.weekend && weekendAxisSegmentClass)
                                : 'text-[10px] text-slate-500 dark:text-neutral-400',
                        )}
                        style={{ left: segment.x, width: segment.width, height: BAND_HEIGHT }}
                    >
                        <span className="truncate px-1">{segment.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
