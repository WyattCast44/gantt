import { type Task } from '@/types';
import { ROW_HEIGHT } from '@/utils/gantt';
import { type GanttRow } from '@/utils/ganttLayout';
import { useMemo, useState } from 'react';

type ConnectorTarget = {
    predecessor: { id: number; name: string };
    successor: Task;
};

type DependencyLayerProps = {
    rows: GanttRow[];
    width: number;
    height: number;
    /** Editors get clickable connectors (hover highlight + removal menu). */
    interactive?: boolean;
    /** Open the connector menu at the pointer (click or right-click). */
    onConnectorMenu?: (event: React.MouseEvent, target: ConnectorTarget) => void;
};

/** Horizontal stub before turning, and arrowhead size, in pixels. */
const STUB = 10;

/** Invisible twin-path width that makes thin connectors easy to hit. */
const HIT_WIDTH = 10;

/**
 * SVG overlay drawing finish-to-start dependency connectors: an orthogonal
 * elbow from each predecessor's bar end into its successor's bar start, with an
 * arrowhead. Endpoints are derived purely from the store layout (visible rows
 * with bars), so the lines recompute on zoom/collapse without touching the DOM.
 * A line is drawn only when both endpoints are currently visible. A violated
 * dependency (the successor starts on or before the predecessor ends — see
 * Task.schedule_conflicts) renders as a dashed red connector.
 *
 * For editors each connector carries an invisible wide twin path; hovering it
 * highlights the visible line and clicking (either button) opens the removal
 * menu via `onConnectorMenu`.
 */
export default function DependencyLayer({ rows, width, height, interactive = false, onConnectorMenu }: DependencyLayerProps) {
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const paths = useMemo(() => {
        const position = new Map<number, { startX: number; endX: number; y: number }>();

        for (const row of rows) {
            if (row.bar !== null) {
                position.set(row.task.id, {
                    startX: row.bar.x,
                    endX: row.bar.x + row.bar.width,
                    y: row.top + ROW_HEIGHT / 2,
                });
            }
        }

        const segments: { key: string; d: string; conflicted: boolean; target: ConnectorTarget }[] = [];

        for (const row of rows) {
            const target = position.get(row.task.id);

            if (target === undefined || row.task.predecessors === undefined) {
                continue;
            }

            for (const predecessor of row.task.predecessors) {
                const source = position.get(predecessor.id);

                if (source === undefined) {
                    continue;
                }

                const midX = Math.max(source.endX + STUB, target.startX - STUB);
                segments.push({
                    key: `${predecessor.id}-${row.task.id}`,
                    d: `M ${source.endX} ${source.y} H ${midX} V ${target.y} H ${target.startX}`,
                    conflicted: row.task.schedule_conflicts?.includes(predecessor.id) ?? false,
                    target: { predecessor: { id: predecessor.id, name: predecessor.name }, successor: row.task },
                });
            }
        }

        return segments;
    }, [rows]);

    if (paths.length === 0) {
        return null;
    }

    return (
        // pointer-events: none inherits to every child; the interactive hit
        // paths override it with pointer-events: stroke on themselves.
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={width} height={height} aria-hidden>
            <defs>
                <marker id="gantt-dependency-arrow" markerUnits="userSpaceOnUse" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" className="fill-slate-400 dark:fill-neutral-500" />
                </marker>
                <marker
                    id="gantt-dependency-arrow-conflict"
                    markerUnits="userSpaceOnUse"
                    markerWidth={8}
                    markerHeight={8}
                    refX={7}
                    refY={4}
                    orient="auto"
                >
                    <path d="M0 0 L8 4 L0 8 z" className="fill-red-500" />
                </marker>
            </defs>
            {paths.map((path) => (
                <g key={path.key}>
                    <path
                        data-conflict={path.conflicted ? 'true' : undefined}
                        d={path.d}
                        fill="none"
                        strokeWidth={hoveredKey === path.key ? 2.5 : 1.5}
                        strokeDasharray={path.conflicted ? '4 3' : undefined}
                        markerEnd={path.conflicted ? 'url(#gantt-dependency-arrow-conflict)' : 'url(#gantt-dependency-arrow)'}
                        className={
                            path.conflicted
                                ? 'stroke-red-500'
                                : hoveredKey === path.key
                                  ? 'stroke-accent-500'
                                  : 'stroke-slate-400 dark:stroke-neutral-500'
                        }
                    />
                    {interactive && (
                        <path
                            data-testid={`dependency-hit-${path.key}`}
                            d={path.d}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={HIT_WIDTH}
                            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                            onPointerEnter={() => setHoveredKey(path.key)}
                            onPointerLeave={() => setHoveredKey((current) => (current === path.key ? null : current))}
                            onClick={(event) => onConnectorMenu?.(event, path.target)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onConnectorMenu?.(event, path.target);
                            }}
                        />
                    )}
                </g>
            ))}
        </svg>
    );
}
