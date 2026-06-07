import { cn } from '@/utils/cn';
import { useEffect, type ReactNode } from 'react';

type ModalSize = 'md' | 'lg' | 'xl';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: ModalSize;
    className?: string;
};

const modalSizes: Record<ModalSize, string> = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60" onClick={onClose} aria-hidden />
            <div
                role="dialog"
                aria-modal="true"
                className={cn(
                    'relative z-10 w-full rounded-lg border border-border bg-white p-5 dark:border-border-dark dark:bg-neutral-900',
                    modalSizes[size],
                    className,
                )}
            >
                {title && <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>}
                <div className={cn(title && 'mt-3')}>{children}</div>
            </div>
        </div>
    );
}
