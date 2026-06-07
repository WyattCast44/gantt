import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/utils/cn';
import { focusRingIcon } from '@/utils/focusRing';
import { useSidePanel } from '@/Contexts/SidePanelContext';

const STORAGE_KEY = 'side-panel-width';
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

function getStoredWidth(): number {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
                return parsed;
            }
        }
    } catch {
        // localStorage unavailable
    }
    return DEFAULT_WIDTH;
}

export default function SidePanel() {
    const { isOpen, title, content, closePanel } = useSidePanel();
    const [width, setWidth] = useState(getStoredWidth);
    const isDragging = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                closePanel();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closePanel]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const startX = e.clientX;
        const startWidth = panelRef.current?.offsetWidth ?? width;

        function handleMouseMove(e: MouseEvent) {
            if (!isDragging.current) {
                return;
            }
            const delta = startX - e.clientX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            setWidth(newWidth);
        }

        function handleMouseUp() {
            isDragging.current = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            if (panelRef.current) {
                try {
                    localStorage.setItem(STORAGE_KEY, String(panelRef.current.offsetWidth));
                } catch {
                    // localStorage unavailable
                }
            }
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [width]);

    return (
        <div
            ref={panelRef}
            style={{ width: isOpen ? width : 0 }}
            className={`relative shrink-0 overflow-hidden border-l border-border bg-white transition-[width] duration-200 ease-in-out dark:border-border-dark dark:bg-neutral-950 ${
                isOpen ? 'border-l' : 'border-l-0'
            }`}
        >
            {/* Resize handle */}
            <div
                onMouseDown={handleMouseDown}
                className="absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize hover:bg-accent-500/40 active:bg-accent-500/60"
            />

            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3 dark:border-border-dark">
                    <h2 className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={closePanel}
                        className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-300',
                            focusRingIcon,
                        )}
                        title="Close panel (Esc)"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                        >
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {content}
                </div>
            </div>
        </div>
    );
}
