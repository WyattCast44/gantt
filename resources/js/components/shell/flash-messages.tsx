import { type SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { usePage } from '@inertiajs/react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

let nextId = 0;

type FlashMessagesProps = {
    /** When true (default), each toast clears after `durationMs`. */
    autoDismiss?: boolean;
    /** Default duration in ms when `autoDismiss` is true. */
    durationMs?: number;
};

export default function FlashMessages({ autoDismiss = true, durationMs = 5000 }: FlashMessagesProps) {
    const { flash } = usePage<SharedProps>().props;
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const clearTimer = useCallback((id: number) => {
        const timer = timersRef.current.get(id);

        if (timer !== undefined) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const dismiss = useCallback(
        (id: number) => {
            clearTimer(id);
            setToasts((previous) => previous.filter((toast) => toast.id !== id));
        },
        [clearTimer],
    );

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timer) => clearTimeout(timer));
            timersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        function enqueue(type: ToastType, message: string): void {
            const id = ++nextId;
            setToasts((previous) => [...previous, { id, type, message }]);

            if (autoDismiss && durationMs > 0) {
                const timer = setTimeout(() => dismiss(id), durationMs);
                timersRef.current.set(id, timer);
            }
        }

        if (flash.status) {
            enqueue('success', flash.status);
        }
    }, [flash.status, autoDismiss, durationMs, dismiss]);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            className="pointer-events-none fixed top-16 right-4 z-50 flex max-w-sm flex-col gap-2"
            role="region"
            aria-label="Notifications"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="status"
                    className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 shadow-md dark:border-border-dark dark:bg-neutral-900"
                >
                    <ToastIcon type={toast.type} />
                    <p className="min-w-0 flex-1 text-sm leading-normal text-slate-800 dark:text-neutral-100">
                        {toast.message}
                    </p>
                    <button
                        type="button"
                        onClick={() => dismiss(toast.id)}
                        className={cn(
                            'flex shrink-0 items-center justify-center rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                            focusRingNeutral,
                        )}
                        aria-label="Dismiss notification"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            ))}
        </div>
    );
}

function ToastIcon({ type }: { type: ToastType }) {
    if (type === 'success') {
        return (
            <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"
                aria-hidden
            >
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
        );
    }

    if (type === 'error') {
        return (
            <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500"
                aria-hidden
            >
                <X className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
        );
    }

    return (
        <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500"
            aria-hidden
        >
            <AlertTriangle className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>
    );
}
