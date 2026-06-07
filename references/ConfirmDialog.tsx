import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/Components/Button';

interface ConfirmDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
    open,
    onConfirm,
    onCancel,
    title,
    description,
    confirmLabel = 'Confirm',
    confirmVariant = 'danger',
}: ConfirmDialogProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
            if (e.key === 'Tab') {
                const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },
        [onCancel],
    );

    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', handleKeyDown);
        cancelRef.current?.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, handleKeyDown]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50 dark:bg-black/70"
                onClick={onCancel}
            />
            <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {title}
                </h3>
                {description && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">
                        {description}
                    </p>
                )}
                <div className="mt-5 flex justify-end gap-3">
                    <Button
                        ref={cancelRef}
                        variant="ghost"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        ref={confirmRef}
                        variant={confirmVariant}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
