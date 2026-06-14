import { type BarMetrics, BAR_HEIGHT, INDENT_STEP, ROW_HEIGHT } from '@/utils/gantt';
import { useGanttStore } from '@/stores/useGanttStore';
import { cn } from '@/utils/cn';
import { useEffect, useRef } from 'react';

const VERTICAL_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

/** The dashed one-day ghost bar both quick-create row kinds show. */
function GhostBar({ bar, pending = false }: { bar: BarMetrics | null; pending?: boolean }) {
    if (bar === null) {
        return null;
    }

    return (
        <div
            className={cn(
                'absolute rounded-sm border border-dashed border-accent-400 bg-accent-100/50 dark:border-accent-600 dark:bg-accent-500/10',
                pending && 'animate-pulse',
            )}
            style={{ left: bar.x, width: bar.width, top: VERTICAL_PADDING, height: BAR_HEIGHT }}
            aria-hidden
        />
    );
}

type QuickPendingRowProps = {
    name: string;
    depth: number;
    bar: BarMetrics | null;
    contentWidth: number;
};

/** A committed quick-create awaiting the server: greyed, non-interactive. */
export function QuickPendingRow({ name, depth, bar, contentWidth }: QuickPendingRowProps) {
    const leftPaneWidth = useGanttStore((state) => state.leftPaneWidth);

    return (
        <>
            <div
                className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-b border-border bg-white pr-1 opacity-60 dark:border-border-dark dark:bg-neutral-950"
                style={{ width: leftPaneWidth, height: ROW_HEIGHT, paddingLeft: 8 + depth * INDENT_STEP + 24 }}
            >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-500 italic dark:text-neutral-400">{name}</span>
            </div>

            <div className="relative border-b border-border/60 dark:border-border-dark/60" style={{ width: contentWidth, height: ROW_HEIGHT }}>
                <GhostBar bar={bar} pending />
            </div>
        </>
    );
}

type QuickInputRowProps = {
    depth: number;
    bar: BarMetrics | null;
    contentWidth: number;
    value: string;
    error: string | null;
    onChange: (value: string) => void;
    /** Commit the (non-blank) name and chain the next draft. */
    onCommit: (name: string) => void;
    onCancel: () => void;
    /** Tab / Shift+Tab re-anchor the draft one level deeper / shallower. */
    onIndent: (delta: 1 | -1) => void;
};

/**
 * The editable quick-create row: an inline name input at the draft's indent
 * with a ghost bar previewing where the task will land. Enter commits and
 * chains; Esc cancels; blur commits a non-blank name; Tab/Shift+Tab indent.
 */
export function QuickInputRow({ depth, bar, contentWidth, value, error, onChange, onCommit, onCancel, onIndent }: QuickInputRowProps) {
    const leftPaneWidth = useGanttStore((state) => state.leftPaneWidth);
    const inputRef = useRef<HTMLInputElement>(null);
    // Set while Enter/Esc already resolved the row, so the resulting blur
    // doesn't double-commit or cancel a chained draft.
    const settled = useRef(false);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const commit = (): void => {
        const name = value.trim();

        if (name === '') {
            onCancel();

            return;
        }

        onCommit(name);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            settled.current = true;
            commit();
            settled.current = false;

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            settled.current = true;
            onCancel();

            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            onIndent(event.shiftKey ? -1 : 1);
        }
    };

    const onBlur = (): void => {
        if (settled.current) {
            return;
        }

        commit();

        if (value.trim() !== '') {
            // A pointer-blur commit should not leave a chained input behind.
            onCancel();
        }
    };

    return (
        <>
            <div
                className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-b border-accent-300 bg-accent-50/60 pr-1 dark:border-accent-700 dark:bg-accent-500/10"
                style={{ width: leftPaneWidth, height: ROW_HEIGHT, paddingLeft: 8 + depth * INDENT_STEP + 24 }}
            >
                <input
                    ref={inputRef}
                    data-testid="quick-create-input"
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={onBlur}
                    placeholder="Task name…"
                    aria-label="New task name"
                    aria-invalid={error !== null}
                    className="min-w-0 flex-1 rounded-sm border-0 bg-transparent p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
                />
                {error !== null && (
                    <span className="max-w-32 shrink-0 truncate text-xs text-red-600 dark:text-red-400" title={error}>
                        {error}
                    </span>
                )}
            </div>

            <div className="relative border-b border-border/60 dark:border-border-dark/60" style={{ width: contentWidth, height: ROW_HEIGHT }}>
                <GhostBar bar={bar} />
            </div>
        </>
    );
}
