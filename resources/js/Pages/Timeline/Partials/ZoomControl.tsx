import { Tooltip } from '@/components/ui/tooltip';
import { ZOOM_CONFIG, ZOOM_LEVELS, type ZoomLevel } from '@/utils/gantt';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

type ZoomControlProps = {
    zoom: ZoomLevel;
    onChange: (zoom: ZoomLevel) => void;
};

const ZOOM_TOOLTIPS: Record<ZoomLevel, string> = {
    day: 'Day view (D)',
    month: 'Month view (M)',
    quarter: 'Quarter view (Q)',
    year: 'Year view (Y)',
};

/** Segmented control switching the timeline time-scale (day/month/quarter/year). */
export default function ZoomControl({ zoom, onChange }: ZoomControlProps) {
    return (
        <div className="inline-flex overflow-hidden rounded-md border border-border dark:border-border-dark" role="group" aria-label="Zoom level">
            {ZOOM_LEVELS.map((level, index) => {
                const active = level === zoom;

                return (
                    <Tooltip key={level} label={ZOOM_TOOLTIPS[level]} className="flex">
                        <button
                            type="button"
                            aria-pressed={active}
                            aria-label={ZOOM_TOOLTIPS[level]}
                            onClick={() => onChange(level)}
                            className={cn(
                                'cursor-pointer px-3 py-1.5 text-xs font-medium transition',
                                index < ZOOM_LEVELS.length - 1 && 'border-r border-border dark:border-border-dark',
                                focusRingNeutral,
                                active
                                    ? 'bg-accent-600 text-white dark:bg-accent-500'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                            )}
                        >
                            {ZOOM_CONFIG[level].label}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
