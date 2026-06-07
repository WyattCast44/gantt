import { cn } from '@/utils/cn';
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'top' | 'bottom';

type TooltipProps = {
    /** Tooltip text shown on hover or focus. */
    label: string;
    children: ReactNode;
    /** Position relative to the trigger. */
    placement?: TooltipPlacement;
    className?: string;
};

/**
 * Fixed-position tooltip portaled to `document.body` so it is not clipped by overflow containers.
 */
export function Tooltip({ label, children, placement = 'top', className }: TooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const tooltipId = useId();

    const updatePosition = useCallback(() => {
        const element = triggerRef.current;

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();

        setCoords({
            top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
            left: rect.left + rect.width / 2,
        });
    }, [placement]);

    const show = useCallback(() => {
        updatePosition();
        setOpen(true);
    }, [updatePosition]);

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

    return (
        <span
            ref={triggerRef}
            className={cn('inline-flex', className)}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            <span aria-describedby={open ? tooltipId : undefined} className="inline-flex">
                {children}
            </span>
            {open &&
                createPortal(
                    <span
                        id={tooltipId}
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            transform: placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)',
                            zIndex: 200,
                        }}
                        className="pointer-events-none max-w-[14rem] rounded-md border border-border-dark bg-slate-900 px-2 py-1 text-xs font-medium whitespace-normal text-white dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                    >
                        {label}
                    </span>,
                    document.body,
                )}
        </span>
    );
}
