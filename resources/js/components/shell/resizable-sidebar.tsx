import Button from '@/components/ui/button';
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';
import { collapsed as collapsedRoute, width as widthRoute } from '@/routes/sidebar';
import { type SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { router, usePage } from '@inertiajs/react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 224;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

type ResizableSidebarProps = {
    children: ReactNode;
    className?: string;
};

export default function ResizableSidebar({ children, className }: ResizableSidebarProps) {
    const { sidebarWidth: sharedWidth, sidebarCollapsed } = usePage<SharedProps>().props;
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
            collapsedRoute.url(),
            { collapsed: !sidebarCollapsed },
            { preserveScroll: true, only: ['sidebarCollapsed'] },
        );
    }, [sidebarCollapsed]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'b') {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && (target.closest('[contenteditable="true"]') || target.closest('input, textarea, select'))) {
                return;
            }
            event.preventDefault();
            toggleCollapsed();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleCollapsed]);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (sidebarCollapsed) {
                return;
            }
            event.preventDefault();
            isDragging.current = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            const startX = event.clientX;
            const startWidth = asideRef.current?.offsetWidth ?? width;

            function handleMouseMove(moveEvent: MouseEvent): void {
                if (!isDragging.current) {
                    return;
                }
                const delta = moveEvent.clientX - startX;
                const next = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, startWidth + delta));
                setWidth(next);
            }

            function handleMouseUp(): void {
                isDragging.current = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                const element = asideRef.current;
                if (!element) {
                    return;
                }
                const resolved = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, element.offsetWidth));
                router.put(
                    widthRoute.url(),
                    { width: resolved },
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
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>

            <div className="shrink-0 border-t border-border px-3 py-2 dark:border-border-dark">
                <SidebarTooltip
                    enabled={sidebarCollapsed}
                    label="Expand sidebar (⌘B / Ctrl+B)"
                    className="w-full"
                >
                    <Button variant="ghost" onClick={toggleCollapsed} className="w-full py-1.5">
                        {sidebarCollapsed ? (
                            <PanelRight className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                            <PanelLeft className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        <span className="sr-only">{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                    </Button>
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
