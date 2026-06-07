import { usePage, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import type { SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { SidebarTooltip } from '@/Components/SidebarTooltip';

export const SIDEBAR_WIDTH_MIN = 200;

export const SIDEBAR_WIDTH_MAX = 400;

export const SIDEBAR_WIDTH_DEFAULT = 224;

export const SIDEBAR_COLLAPSED_WIDTH = 56;

type ResizableSidebarProps = {
    children: React.ReactNode;
    className?: string;
};

export default function ResizableSidebar({ children, className }: ResizableSidebarProps) {
    const page = usePage<{ props: SharedProps }>();
    const { sidebarWidth: sharedWidth, sidebarCollapsed } = page.props as unknown as SharedProps;
    const [width, setWidth] = useState(sharedWidth);
    const asideRef = useRef<HTMLElement>(null);
    const isDragging = useRef(false);
    const sharedWidthRef = useRef(sharedWidth);

    sharedWidthRef.current = sharedWidth;

    useEffect(() => {
        setWidth(sharedWidth);
    }, [sharedWidth]);

    const toggleCollapsed = useCallback(() => {
        router.put(
            '/sidebar/collapsed',
            { collapsed: !sidebarCollapsed },
            {
                preserveScroll: true,
                only: ['sidebarCollapsed'],
            },
        );
    }, [sidebarCollapsed]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent): void {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'b') {
                return;
            }
            const target = e.target as HTMLElement | null;
            if (target && (target.closest('[contenteditable="true"]') || target.closest('input, textarea, select'))) {
                return;
            }
            e.preventDefault();
            toggleCollapsed();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleCollapsed]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (sidebarCollapsed) {
                return;
            }
            e.preventDefault();
            isDragging.current = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            const startX = e.clientX;
            const startWidth = asideRef.current?.offsetWidth ?? width;

            function handleMouseMove(ev: MouseEvent): void {
                if (!isDragging.current) {
                    return;
                }
                const delta = ev.clientX - startX;
                const next = Math.min(
                    SIDEBAR_WIDTH_MAX,
                    Math.max(SIDEBAR_WIDTH_MIN, startWidth + delta),
                );
                setWidth(next);
            }

            function handleMouseUp(): void {
                isDragging.current = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                const el = asideRef.current;
                if (!el) {
                    return;
                }
                const w = Math.min(
                    SIDEBAR_WIDTH_MAX,
                    Math.max(SIDEBAR_WIDTH_MIN, el.offsetWidth),
                );
                router.put(
                    '/sidebar/width',
                    { width: w },
                    {
                        preserveScroll: true,
                        only: ['sidebarWidth'],
                        onError: () => setWidth(sharedWidthRef.current),
                    },
                );
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [sidebarCollapsed, width],
    );

    const displayWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width;

    return (
        <aside
            ref={asideRef}
            style={{ width: displayWidth }}
            className={cn(
                'relative z-20 flex shrink-0 flex-col overflow-visible border-r border-border bg-white transition-[width] duration-200 ease-out dark:border-border-dark dark:bg-neutral-900',
                className,
            )}
        >
            <div className="flex min-h-0 flex-1 flex-col overflow-visible">{children}</div>
            <div className="shrink-0 border-t border-border px-2 py-2 dark:border-border-dark">
                <SidebarTooltip
                    enabled
                    label={
                        sidebarCollapsed
                            ? 'Expand sidebar (⌘B / Ctrl+B)'
                            : 'Collapse sidebar (⌘B / Ctrl+B)'
                    }
                    className="w-full"
                >
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        className={cn(
                            'flex w-full items-center justify-center rounded-md py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                            focusRingNeutral,
                        )}
                    >
                        {sidebarCollapsed ? (
                            <PanelRight className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                            <PanelLeft className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        <span className="sr-only">
                            {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        </span>
                    </button>
                </SidebarTooltip>
            </div>
            {!sidebarCollapsed && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                    title="Drag to resize sidebar"
                    onMouseDown={handleMouseDown}
                    className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize hover:bg-accent-500/40 active:bg-accent-500/60"
                />
            )}
        </aside>
    );
}
