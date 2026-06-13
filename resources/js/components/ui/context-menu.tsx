import { cn } from '@/utils/cn';
import { ChevronRight } from 'lucide-react';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Pointer-anchored context menu: a portaled panel opened at the right-click
 * coordinates, flipped away from viewport edges, dismissed by Escape, any
 * outside pointer press, or selecting an item. The caller owns the open state
 * (one menu at a time) and renders it conditionally.
 */

const ContextMenuContext = createContext<{ close: () => void } | null>(null);

function useContextMenu(): { close: () => void } {
    const context = useContext(ContextMenuContext);

    if (context === null) {
        throw new Error('Context-menu components must be used within <ContextMenu>.');
    }

    return context;
}

type ContextMenuProps = {
    /** Pointer coordinates (viewport space) the menu opens at. */
    x: number;
    y: number;
    onClose: () => void;
    children: ReactNode;
    'aria-label'?: string;
};

export function ContextMenu({ x, y, onClose, children, 'aria-label': ariaLabel }: ContextMenuProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x });

    // Flip away from the viewport edges once the panel size is measurable.
    useLayoutEffect(() => {
        const panel = panelRef.current;

        if (panel === null) {
            return;
        }

        const rect = panel.getBoundingClientRect();

        setPosition({
            left: x + rect.width > window.innerWidth - 8 ? Math.max(8, x - rect.width) : x,
            top: y + rect.height > window.innerHeight - 8 ? Math.max(8, y - rect.height) : y,
        });
    }, [x, y]);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent): void => {
            if (!panelRef.current?.contains(event.target as Node)) {
                onClose();
            }
        };

        // Capture phase so the chart's own Escape handling never also fires.
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [onClose]);

    return createPortal(
        <div
            ref={panelRef}
            role="menu"
            aria-label={ariaLabel}
            data-testid="context-menu"
            style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 200 }}
            className="min-w-52 rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-900"
            onContextMenu={(event) => event.preventDefault()}
        >
            <ContextMenuContext.Provider value={{ close: onClose }}>{children}</ContextMenuContext.Provider>
        </div>,
        document.body,
    );
}

type ContextMenuItemProps = {
    children: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    /** Why the item is disabled (shown as a native tooltip). */
    disabledReason?: string;
    destructive?: boolean;
    /** Hotkey hint rendered at the right edge, e.g. "N" or "⇧N". */
    shortcut?: string;
};

export function ContextMenuItem({ children, onSelect, disabled = false, disabledReason, destructive = false, shortcut }: ContextMenuItemProps) {
    const { close } = useContextMenu();

    return (
        <button
            type="button"
            role="menuitem"
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            onClick={() => {
                close();
                onSelect?.();
            }}
            className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
                destructive
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-neutral-200 dark:hover:bg-neutral-800',
            )}
        >
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {shortcut !== undefined && (
                <kbd className="shrink-0 rounded border border-slate-200 bg-slate-100/90 px-1 font-sans text-[10px] font-medium text-slate-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500">
                    {shortcut}
                </kbd>
            )}
        </button>
    );
}

type ContextMenuSubProps = {
    label: ReactNode;
    children: ReactNode;
    disabled?: boolean;
};

/** A hover-opened submenu (e.g. the Dependencies list). */
export function ContextMenuSub({ label, children, disabled = false }: ContextMenuSubProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative" onMouseEnter={() => !disabled && setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={disabled}
                // Open-only: hover may have opened it already, so a toggle
                // would close the submenu the user is trying to enter.
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            </button>
            {open && (
                // Padding (not margin) bridges the visual gap so the pointer
                // never leaves the hover area while crossing to the panel.
                <div role="presentation" className="absolute top-0 left-full pl-1">
                    <div
                        role="menu"
                        className="min-w-44 rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-900"
                    >
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ContextMenuLabel({ children }: { children: ReactNode }) {
    return <div className="px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-neutral-500">{children}</div>;
}

export function ContextMenuSeparator() {
    return <div className="my-1 h-px bg-border dark:bg-border-dark" />;
}
