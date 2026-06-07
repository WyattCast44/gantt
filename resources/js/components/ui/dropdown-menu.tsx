import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

type DropdownPlacement = 'bottom-start' | 'right-start';

type DropdownContextValue = {
    open: boolean;
    setOpen: (value: boolean) => void;
    triggerRef: RefObject<HTMLButtonElement | null>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(): DropdownContextValue {
    const context = useContext(DropdownContext);

    if (context === null) {
        throw new Error('Dropdown components must be used within <DropdownMenu>.');
    }

    return context;
}

export function DropdownMenu({ children, className }: { children: ReactNode; className?: string }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: MouseEvent): void {
            const target = event.target as Node;

            if (containerRef.current?.contains(target)) {
                return;
            }

            if (triggerRef.current?.contains(target)) {
                return;
            }

            const portaled = document.querySelector('[data-dropdown-portal]');

            if (portaled?.contains(target)) {
                return;
            }

            setOpen(false);
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
            <div ref={containerRef} className={cn('relative', className)}>
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

export function DropdownMenuTrigger({
    children,
    className,
    'aria-label': ariaLabel,
}: {
    children: ReactNode;
    className?: string;
    'aria-label'?: string;
}) {
    const { open, setOpen, triggerRef } = useDropdown();

    return (
        <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={ariaLabel}
            onClick={() => setOpen(!open)}
            className={cn('inline-flex items-center rounded-md', focusRingNeutral, className)}
        >
            {children}
        </button>
    );
}

export function DropdownMenuContent({
    children,
    align = 'start',
    placement = 'bottom-start',
    portaled = false,
    className,
}: {
    children: ReactNode;
    align?: 'start' | 'end';
    placement?: DropdownPlacement;
    portaled?: boolean;
    className?: string;
}) {
    const { open, triggerRef } = useDropdown();
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useLayoutEffect(() => {
        if (!open || !portaled) {
            return;
        }

        function updatePosition(): void {
            const rect = triggerRef.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            if (placement === 'right-start') {
                setCoords({ top: rect.top, left: rect.right + 8 });

                return;
            }

            setCoords({ top: rect.bottom + 4, left: align === 'end' ? rect.right : rect.left });
        }

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, portaled, placement, align, triggerRef]);

    if (!open) {
        return null;
    }

    const panelClassName = cn(
        'z-50 min-w-52 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-900',
        !portaled && 'absolute',
        !portaled && placement === 'bottom-start' && 'mt-1',
        !portaled && placement === 'bottom-start' && (align === 'end' ? 'right-0' : 'left-0'),
        !portaled && placement === 'right-start' && 'left-full top-0 ml-2',
        className,
    );

    const panel = (
        <div
            role="menu"
            data-dropdown-portal={portaled ? '' : undefined}
            style={
                portaled
                    ? { position: 'fixed', top: coords.top, left: coords.left, zIndex: 200 }
                    : undefined
            }
            className={panelClassName}
        >
            {children}
        </div>
    );

    if (portaled) {
        return createPortal(panel, document.body);
    }

    return panel;
}

export function DropdownMenuItem({
    children,
    onSelect,
    disabled = false,
    className,
}: {
    children: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const { setOpen } = useDropdown();

    return (
        <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
                onSelect?.();
                setOpen(false);
            }}
            className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800',
                className,
            )}
        >
            {children}
        </button>
    );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-neutral-500', className)}>
            {children}
        </div>
    );
}

export function DropdownMenuSeparator() {
    return <div className="my-1 h-px bg-border dark:bg-border-dark" />;
}
