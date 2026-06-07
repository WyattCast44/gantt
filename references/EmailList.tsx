import { useState } from 'react';
import { router } from '@inertiajs/react';
import type { EmailMessage } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingIcon, focusRingInsetRow } from '@/utils/focusRing';
import { useSidePanel } from '@/Contexts/SidePanelContext';
import ConfirmDialog from '@/Components/ConfirmDialog';
import EmailViewerPanel from '@/Components/EmailViewerPanel';
import EmptyState from '@/Components/EmptyState';
import Card from '@/Components/Card';
import Badge from '@/Components/Badge';
import { Trash2 } from 'lucide-react';

interface EmailListProps {
    emails: EmailMessage[];
    attachableType: 'account' | 'bill' | 'income' | 'credit_report' | 'member' | 'vehicle';
    attachableId: number;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function EmailList({ emails, attachableType, attachableId }: EmailListProps) {
    const [detachTarget, setDetachTarget] = useState<EmailMessage | null>(null);
    const { openPanel } = useSidePanel();

    function handleDetach() {
        if (!detachTarget) {
            return;
        }
        router.delete(`/emails/${detachTarget.id}/detach`, {
            data: { attachable_type: attachableType, attachable_id: attachableId },
            preserveScroll: true,
            onSuccess: () => setDetachTarget(null),
        });
    }

    return (
        <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Emails</h3>

            {emails.length === 0 ? (
                <EmptyState
                    density="compact"
                    dashed
                    message="No emails linked yet. Save one from the Inbox to link it here."
                />
            ) : (
                <Card padding="none">
                    <ul className="divide-y divide-border/30 dark:divide-border-dark/30">
                        {emails.map((email) => (
                            <li key={email.id} className="flex items-stretch">
                                <button
                                    type="button"
                                    onClick={() =>
                                        openPanel(
                                            email.subject ?? '(no subject)',
                                            <EmailViewerPanel emailId={email.id} />,
                                        )
                                    }
                                    className={cn(
                                        'flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800/60',
                                        focusRingInsetRow,
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800 dark:text-neutral-100">
                                            {email.subject ?? '(no subject)'}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-neutral-400">
                                            {email.from_name ?? email.from_email ?? 'Unknown sender'}
                                            {email.sent_at && ` · ${formatDate(email.sent_at)}`}
                                        </p>
                                    </div>
                                    {email.attachments && email.attachments.length > 0 && (
                                        <Badge variant="default">{email.attachments.length} file(s)</Badge>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetachTarget(email)}
                                    aria-label="Detach email"
                                    className={cn(
                                        'mr-2 shrink-0 self-center rounded-md p-1 text-slate-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400',
                                        focusRingIcon,
                                    )}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <ConfirmDialog
                open={detachTarget !== null}
                title="Detach email"
                description="This removes the link to this record. The saved email itself is kept."
                confirmLabel="Detach"
                confirmVariant="danger"
                onConfirm={handleDetach}
                onCancel={() => setDetachTarget(null)}
            />
        </div>
    );
}
