import { useCallback, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

type ResizablePaneEdge = 'start' | 'end';

type ResizablePaneProps = {
    children: React.ReactNode;
    className?: string;
    /** `end` = drag handle on the right edge (left-side panels). `start` = handle on the left (right-side panels). */
    edge: ResizablePaneEdge;
    storageKey: string;
    resizeAriaLabel: string;
    minWidth?: number;
    maxWidth?: number;
    defaultWidth: number;
};

function readStoredWidth(
    storageKey: string,
    minWidth: number,
    maxWidth: number,
    defaultWidth: number,
): number {
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (parsed >= minWidth && parsed <= maxWidth) {
                return parsed;
            }
        }
    } catch {
        // localStorage unavailable
    }

    return defaultWidth;
}

/**
 * Fixed-width column with a drag handle on one edge. Width persists to localStorage.
 * Matches app sidebar / documents folder pane resize behavior.
 */
export default function ResizablePane({
    children,
    className,
    edge,
    storageKey,
    resizeAriaLabel,
    minWidth = 200,
    maxWidth = 400,
    defaultWidth,
}: ResizablePaneProps) {
    const [width, setWidth] = useState(() =>
        readStoredWidth(storageKey, minWidth, maxWidth, defaultWidth),
    );
    const [isResizing, setIsResizing] = useState(false);
    const paneRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            isDragging.current = true;
            setIsResizing(true);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            const startX = e.clientX;
            const startWidth = paneRef.current?.offsetWidth ?? width;

            function handleMouseMove(ev: MouseEvent): void {
                if (!isDragging.current) {
                    return;
                }
                const rawDelta = ev.clientX - startX;
                const delta = edge === 'end' ? rawDelta : -rawDelta;
                const next = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
                setWidth(next);
            }

            function handleMouseUp(): void {
                isDragging.current = false;
                setIsResizing(false);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                const el = paneRef.current;
                if (!el) {
                    return;
                }
                const w = Math.min(maxWidth, Math.max(minWidth, el.offsetWidth));
                try {
                    localStorage.setItem(storageKey, String(w));
                } catch {
                    // localStorage unavailable
                }
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [edge, maxWidth, minWidth, storageKey, width],
    );

    return (
        <div
            ref={paneRef}
            style={{ width }}
            className={cn(
                'relative flex min-h-0 shrink-0 flex-col overflow-hidden',
                !isResizing && 'transition-[width] duration-200 ease-out',
                className,
            )}
        >
            {children}
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={resizeAriaLabel}
                title={resizeAriaLabel}
                onMouseDown={handleMouseDown}
                className={cn(
                    'absolute inset-y-0 z-10 w-1 cursor-col-resize hover:bg-accent-500/40 active:bg-accent-500/60',
                    edge === 'end' ? 'right-0' : 'left-0',
                )}
            />
        </div>
    );
}
