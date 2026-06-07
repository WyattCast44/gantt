import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    processing?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    processing = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onCancel} title={title}>
            {description && <p className="text-sm text-slate-600 dark:text-neutral-300">{description}</p>}
            <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel} disabled={processing}>
                    {cancelLabel}
                </Button>
                <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={processing}>
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
