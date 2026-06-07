import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import type { Document, HouseholdDocument } from '@/types';
import { formatFileSize } from '@/utils/format';
import { formatRelativeDate } from '@/utils/date';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { tableActionsCell, tableBase, tableBody, tableBodyRow, tableHeadCell, tableHeadCellNumeric, tableHeadRow } from '@/utils/tableStyles';
import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/ConfirmDialog';
import EmptyState from '@/Components/EmptyState';
import Card from '@/Components/Card';
import { useSidePanel } from '@/Contexts/SidePanelContext';
import AttachDocumentPanel from '@/Pages/Documents/Partials/AttachDocumentPanel';
import type { AttachmentOptions } from '@/Pages/Documents/Partials/DocumentAttachmentFields';

interface DocumentListProps {
    documents: Document[];
    householdDocuments: HouseholdDocument[];
    attachableType: 'account' | 'bill' | 'income' | 'credit_report' | 'member' | 'vehicle';
    attachableId: number;
    attachmentOptions: AttachmentOptions;
}

export default function DocumentList({ documents, householdDocuments, attachableType, attachableId, attachmentOptions }: DocumentListProps) {
    const { openPanel } = useSidePanel();
    const [detachTarget, setDetachTarget] = useState<Document | null>(null);

    function handleDetach() {
        if (!detachTarget) return;
        router.delete(`/documents/${detachTarget.id}/detach`, {
            data: { attachable_type: attachableType, attachable_id: attachableId },
            preserveScroll: true,
            onSuccess: () => setDetachTarget(null),
        });
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h3>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                            openPanel(
                                'Attach Existing Document',
                                <AttachDocumentPanel
                                    householdDocuments={householdDocuments}
                                    attachedDocuments={documents}
                                    attachableType={attachableType}
                                    attachableId={attachableId}
                                />,
                            )
                        }
                    >
                        Attach
                    </Button>
                    <Button
                        as={Link}
                        href={`/documents/create?attach_type=${attachableType}&attach_id=${attachableId}`}
                        size="sm"
                        variant="secondary"
                    >
                        Upload
                    </Button>
                </div>
            </div>

            {documents.length === 0 ? (
                <EmptyState
                    dashed
                    title="No documents attached"
                    message="Attach an existing file from your household library or upload a new one using the buttons above."
                />
            ) : (
                <Card padding="none" className="overflow-hidden">
                    <table className={tableBase}>
                        <thead>
                            <tr className={tableHeadRow}>
                                <th className={cn(tableHeadCell, 'rounded-tl-lg')}>Name</th>
                                <th className={cn(tableHeadCell, 'whitespace-nowrap')}>Type</th>
                                <th className={cn(tableHeadCellNumeric, 'whitespace-nowrap')}>Size</th>
                                <th className={cn(tableHeadCell, 'whitespace-nowrap')}>Uploaded</th>
                                <th className="whitespace-nowrap rounded-tr-lg px-4 py-2.5 text-right" />
                            </tr>
                        </thead>
                        <tbody className={tableBody}>
                            {documents.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className={cn(
                                        tableBodyRow,
                                        'last:[&>td:first-child]:rounded-bl-lg last:[&>td:last-child]:rounded-br-lg',
                                    )}
                                >
                                    <td className="min-w-0 px-4 py-2.5">
                                        <div className="min-w-0">
                                            <Link
                                                href={`/documents/${doc.id}`}
                                                className={cn(
                                                    'truncate font-medium text-accent-600 hover:underline dark:text-accent-400',
                                                    focusRingNeutral,
                                                )}
                                            >
                                                {doc.name}
                                            </Link>
                                            {(doc.version > 1 || doc.uploader) && (
                                                <p className="text-xs text-slate-400 dark:text-neutral-500">
                                                    {doc.version > 1 && `v${doc.version}`}
                                                    {doc.version > 1 && doc.uploader && ' · '}
                                                    {doc.uploader?.name}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-neutral-400">
                                        {doc.file_type}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-neutral-400">
                                        {formatFileSize(doc.file_size)}
                                    </td>
                                    <td
                                        className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-neutral-400"
                                        title={new Date(doc.created_at).toLocaleString()}
                                    >
                                        {formatRelativeDate(doc.created_at)}
                                    </td>
                                    <td className={cn(tableActionsCell, 'whitespace-nowrap')}>
                                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                                            <Button
                                                as="a"
                                                href={`/documents/${doc.id}/download`}
                                                size="sm"
                                                variant="secondary"
                                                className="!px-2.5 !py-1 text-xs shrink-0"
                                            >
                                                Download
                                            </Button>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                className="!px-2.5 !py-1 text-xs shrink-0"
                                                onClick={() => setDetachTarget(doc)}
                                            >
                                                Detach
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            <ConfirmDialog
                open={detachTarget !== null}
                onCancel={() => setDetachTarget(null)}
                onConfirm={handleDetach}
                title="Detach document?"
                description={`This will remove "${detachTarget?.name}" from this ${attachableType}. The document itself will not be deleted.`}
                confirmLabel="Detach"
                confirmVariant="danger"
            />
        </div>
    );
}
