import { createPortal } from 'react-dom';
import {
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { cn } from '@/utils/cn';

type SidebarTooltipPlacement = 'inline-end' | 'bottom';

type SidebarTooltipProps = {
    /** Tooltip text (shown when enabled and on hover/focus). */
    label: string;
    /** When false, children render with no tooltip behavior. */
    enabled: boolean;
    children: ReactNode;
    className?: string;
    /**
     * `inline-end`: to the right of the trigger, vertically centered (sidebar rail).
     * `bottom`: centered below the trigger (avoids viewport clip on the right edge).
     */
    placement?: SidebarTooltipPlacement;
};

/**
 * Fixed-position tooltip portaled to `document.body` so it is not clipped by sidebar overflow.
 * Use when the sidebar is collapsed (icon rail), or with `placement="bottom"` for compact triggers.
 */
export function SidebarTooltip({
    label,
    enabled,
    children,
    className,
    placement = 'inline-end',
}: SidebarTooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const tooltipId = useId();

    const updatePosition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) {
            return;
        }
        const r = el.getBoundingClientRect();
        if (placement === 'bottom') {
            setCoords({
                top: r.bottom + 8,
                left: r.left + r.width / 2,
            });
        } else {
            setCoords({
                top: r.top + r.height / 2,
                left: r.right + 8,
            });
        }
    }, [placement]);

    const show = useCallback(() => {
        updatePosition();
        setOpen(true);
    }, [updatePosition]);

    const hide = useCallback(() => setOpen(false), []);

    useLayoutEffect(() => {
        if (!open || !enabled) {
            return;
        }
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, enabled, updatePosition]);

    if (!enabled) {
        return <span className={cn('flex w-full min-w-0', className)}>{children}</span>;
    }

    return (
        <span
            ref={triggerRef}
            className={cn('flex w-full min-w-0', className)}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            <span
                aria-describedby={open ? tooltipId : undefined}
                className="flex w-full min-w-0 justify-center"
            >
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
                            transform:
                                placement === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
                            zIndex: 200,
                        }}
                        className={cn(
                            'pointer-events-none rounded-md border border-border-dark bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:border-border-dark dark:bg-neutral-700 dark:text-neutral-100',
                            placement === 'bottom'
                                ? 'max-w-[min(18rem,calc(100vw-1.5rem))] text-center whitespace-normal'
                                : 'max-w-[14rem] text-left whitespace-nowrap',
                        )}
                    >
                        {label}
                    </span>,
                    document.body,
                )}
        </span>
    );
}
