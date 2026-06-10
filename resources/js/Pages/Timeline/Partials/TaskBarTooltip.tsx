import { barSummaryRows } from '@/Pages/Timeline/Partials/barAppearance';
import { type Task } from '@/types';
import { cn } from '@/utils/cn';
import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TaskBarTooltipProps = {
    task: Task;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    /** Suppress the tooltip while the bar is being dragged. */
    disabled?: boolean;
};

/**
 * Rich hover panel for a task bar. Portaled to the document body so it is not
 * clipped by the timeline scroll container.
 */
export default function TaskBarTooltip({ task, children, className, style, disabled = false }: TaskBarTooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const tooltipId = useId();
    const summary = barSummaryRows(task);

    const updatePosition = useCallback(() => {
        const element = triggerRef.current;

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();

        setCoords({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
        });
    }, []);

    const show = useCallback(() => {
        if (disabled) {
            return;
        }

        updatePosition();
        setOpen(true);
    }, [disabled, updatePosition]);

    const hide = useCallback(() => setOpen(false), []);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, updatePosition]);

    useLayoutEffect(() => {
        if (disabled) {
            setOpen(false);
        }
    }, [disabled]);

    return (
        <span
            ref={triggerRef}
            className={cn('absolute', className)}
            style={style}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            <span aria-describedby={open ? tooltipId : undefined} className="block h-full w-full">
                {children}
            </span>
            {open &&
                createPortal(
                    <div
                        id={tooltipId}
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            transform: 'translateX(-50%)',
                            zIndex: 200,
                        }}
                        className="pointer-events-none w-max max-w-[18rem] rounded-md border border-border-dark bg-slate-900 px-3 py-2.5 text-left shadow-lg dark:border-neutral-600 dark:bg-neutral-800"
                    >
                        <p className="text-sm font-semibold text-white dark:text-neutral-100">{summary.title}</p>
                        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                            {summary.rows.map((row) => (
                                <div key={row.label} className="contents">
                                    <dt className="text-slate-400 dark:text-neutral-400">{row.label}</dt>
                                    <dd className="text-slate-100 dark:text-neutral-100">{row.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>,
                    document.body,
                )}
        </span>
    );
}
