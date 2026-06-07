import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingIcon } from '@/utils/focusRing';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

let nextId = 0;

export interface FlashMessagesProps {
    /**
     * When true (default), each toast clears after its duration.
     * When false, toasts stay until the user dismisses them (manual dismiss only).
     */
    autoDismiss?: boolean;
    /**
     * Default duration in ms when `autoDismiss` is true.
     * @default 5000
     */
    durationMs?: number;
    /** Overrides `durationMs` for success toasts only. */
    successDurationMs?: number;
    /** Overrides `durationMs` for error toasts only. */
    errorDurationMs?: number;
    /** Overrides `durationMs` for warning toasts only. */
    warningDurationMs?: number;
}

export default function FlashMessages({
    autoDismiss = true,
    durationMs = 5000,
    successDurationMs,
    errorDurationMs,
    warningDurationMs,
}: FlashMessagesProps) {
    const { flash } = usePage<{ props: SharedProps }>().props as unknown as SharedProps;
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const clearTimer = useCallback((id: number) => {
        const t = timersRef.current.get(id);
        if (t !== undefined) {
            clearTimeout(t);
            timersRef.current.delete(id);
        }
    }, []);

    const dismiss = useCallback(
        (id: number) => {
            clearTimer(id);
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        },
        [clearTimer],
    );

    useEffect(() => {
        return () => {
            timersRef.current.forEach((t) => clearTimeout(t));
            timersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        function resolveDuration(type: ToastType): number | null {
            if (!autoDismiss) {
                return null;
            }
            if (type === 'success') {
                return successDurationMs ?? durationMs;
            }
            if (type === 'error') {
                return errorDurationMs ?? durationMs;
            }

            return warningDurationMs ?? durationMs;
        }

        function enqueue(type: ToastType, message: string): void {
            const id = ++nextId;
            setToasts((prev) => [...prev, { id, type, message }]);
            const ms = resolveDuration(type);
            if (ms !== null && ms > 0) {
                const t = setTimeout(() => dismiss(id), ms);
                timersRef.current.set(id, t);
            }
        }

        if (flash.success) {
            enqueue('success', flash.success);
        }
        if (flash.error) {
            enqueue('error', flash.error);
        }
        if (flash.warning) {
            enqueue('warning', flash.warning);
        }
    }, [
        flash.success,
        flash.error,
        flash.warning,
        autoDismiss,
        durationMs,
        successDurationMs,
        errorDurationMs,
        warningDurationMs,
        dismiss,
    ]);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-md flex-col gap-2"
            role="region"
            aria-label="Notifications"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="status"
                    className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 shadow-md dark:border-border-dark dark:bg-neutral-900"
                >
                    <span
                        className={cn(
                            'flex shrink-0 items-center justify-center',
                            toast.type === 'success' &&
                                'text-emerald-600 dark:text-emerald-400',
                            toast.type === 'error' && 'text-red-600 dark:text-red-400',
                            toast.type === 'warning' &&
                                'text-amber-600 dark:text-amber-400',
                        )}
                        aria-hidden
                    >
                        {toast.type === 'success' && <IconCheckCircle />}
                        {toast.type === 'error' && <IconExclamationCircle />}
                        {toast.type === 'warning' && <IconWarningTriangle />}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-normal text-slate-800 dark:text-neutral-100">
                        {toast.message}
                    </p>
                    <button
                        type="button"
                        onClick={() => dismiss(toast.id)}
                        className={cn(
                            'flex shrink-0 items-center justify-center rounded-md p-1.5 text-slate-500 transition',
                            'hover:bg-slate-100 hover:text-slate-900',
                            'dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                            focusRingIcon,
                        )}
                        aria-label="Dismiss notification"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden
                        >
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}

function IconCheckCircle() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function IconExclamationCircle() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function IconWarningTriangle() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
            />
        </svg>
    );
}
