import { toolbarGroupClass, ToolbarTooltip } from '@/Pages/Timeline/Partials/ToolbarButtonGroup';
import { ZOOM_LEVELS, type ZoomLevel } from '@/utils/gantt';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

type ZoomControlProps = {
    zoom: ZoomLevel;
    onChange: (zoom: ZoomLevel) => void;
};

const ZOOM_SHORT_LABELS: Record<ZoomLevel, string> = {
    day: 'D',
    week: 'W',
    month: 'M',
    quarter: 'Q',
    year: 'Y',
};

const ZOOM_TOOLTIPS: Record<ZoomLevel, string> = {
    day: 'Day view',
    week: 'Week view',
    month: 'Month view',
    quarter: 'Quarter view',
    year: 'Year view',
};

/** Segmented control switching the timeline time-scale (day/week/month/quarter/year). */
export default function ZoomControl({ zoom, onChange }: ZoomControlProps) {
    return (
        <div className={toolbarGroupClass} role="group" aria-label="Zoom level">
            {ZOOM_LEVELS.map((level, index) => {
                const active = level === zoom;

                return (
                    <ToolbarTooltip key={level} label={ZOOM_TOOLTIPS[level]}>
                        <button
                            type="button"
                            aria-pressed={active}
                            aria-label={ZOOM_TOOLTIPS[level]}
                            onClick={() => onChange(level)}
                            className={cn(
                                'flex h-full min-w-8 cursor-pointer items-center justify-center px-2.5 py-0 text-xs leading-none font-semibold transition',
                                index < ZOOM_LEVELS.length - 1 && 'border-r border-border dark:border-border-dark',
                                focusRingNeutral,
                                active
                                    ? 'bg-accent-600 text-white dark:bg-accent-500'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                            )}
                        >
                            {ZOOM_SHORT_LABELS[level]}
                        </button>
                    </ToolbarTooltip>
                );
            })}
        </div>
    );
}
