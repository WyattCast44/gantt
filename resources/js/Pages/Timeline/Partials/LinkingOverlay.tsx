import { type LinkPointer } from '@/Pages/Timeline/useDependencyLinking';
import { ROW_HEIGHT } from '@/utils/gantt';
import { type GanttRow } from '@/utils/ganttLayout';

type LinkingOverlayProps = {
    rows: GanttRow[];
    sourceTaskId: number;
    pointer: LinkPointer | null;
    width: number;
    height: number;
};

/** Horizontal stub before turning, matching DependencyLayer's elbows. */
const STUB = 10;

/**
 * The live dependency-link preview: a dashed elbow from the source task's bar
 * end to the cursor while a link is being drawn. Coordinates come from the
 * store layout, so the line stays put through scrolling and virtualization.
 */
export default function LinkingOverlay({ rows, sourceTaskId, pointer, width, height }: LinkingOverlayProps) {
    const sourceRow = rows.find((row) => row.task.id === sourceTaskId);

    if (pointer === null || sourceRow === undefined || sourceRow.bar === null) {
        return null;
    }

    const startX = sourceRow.bar.x + sourceRow.bar.width;
    const startY = sourceRow.top + ROW_HEIGHT / 2;
    const midX = Math.max(startX + STUB, pointer.x - STUB);

    return (
        <svg
            data-testid="linking-overlay"
            className="pointer-events-none absolute top-0 left-0 z-20 overflow-visible"
            width={width}
            height={height}
            aria-hidden
        >
            <path
                d={`M ${startX} ${startY} H ${midX} V ${pointer.y} H ${pointer.x}`}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                className="stroke-accent-500"
            />
            <circle cx={startX} cy={startY} r={3} className="fill-accent-500" />
            <circle cx={pointer.x} cy={pointer.y} r={3} className="fill-accent-500" />
        </svg>
    );
}
