import Badge from '@/components/ui/badge';
import Avatar from '@/components/ui/avatar';
import Button, { ButtonLink, buttonClasses } from '@/components/ui/button';
import Card from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PageHeader from '@/components/ui/page-header';
import { Tooltip } from '@/components/ui/tooltip';
import { classificationTooltip, type DocumentTypeValue, typeTooltip } from '@/Pages/Documents/Partials/badges';
import UploadDocumentModal from '@/Pages/Documents/Partials/UploadDocumentModal';
import AppLayout from '@/layouts/app-layout';
import { destroy as documentDestroy, show as documentShow } from '@/routes/projects/documents';
import { type BaseClassificationValue, type Document, type Project } from '@/types';
import { allowedClassifications } from '@/utils/classification';
import { formatDateTime, formatRelativeDate } from '@/utils/date';
import { router, useForm } from '@inertiajs/react';
import { Download, FileText, Pencil, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function Index({ project, documents }: { project: Project; documents: Document[] }) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [deleting, setDeleting] = useState<Document | null>(null);

    const options = useMemo(() => allowedClassifications(project.base_classification.value as BaseClassificationValue), [project.base_classification.value]);

    const deleteForm = useForm({});

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        deleteForm.delete(documentDestroy.url([project.id, deleting.id]), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <AppLayout title="Documents" project={project}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Documents"
                    description="Upload and manage project artifacts, telemetry, and evaluation criteria."
                    actions={
                        project.can.update && (
                            <Button onClick={() => setUploadOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" aria-hidden />
                                Upload
                            </Button>
                        )
                    }
                />

                {documents.length === 0 ? (
                    <Card className="flex flex-col items-center gap-2 py-12 text-center">
                        <FileText className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
                        <p className="text-sm text-slate-600 dark:text-neutral-400">No documents uploaded yet.</p>
                    </Card>
                ) : (
                    <Card padding="none" className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs text-slate-500 dark:border-border-dark dark:text-neutral-400">
                                    <th className="px-4 py-2.5 font-medium">Name</th>
                                    <th className="px-4 py-2.5 font-medium">Type</th>
                                    <th className="px-4 py-2.5 font-medium">Classification</th>
                                    <th className="px-4 py-2.5 font-medium">Size</th>
                                    <th className="px-4 py-2.5 font-medium">Uploaded by</th>
                                    <th className="px-4 py-2.5 font-medium">Updated</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((document) => (
                                    <tr
                                        key={document.id}
                                        onClick={() => router.visit(documentShow.url([project.id, document.id]))}
                                        className="cursor-pointer border-b border-border last:border-0 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-neutral-800/40"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white">{document.name}</div>
                                            <div className="text-xs text-slate-400 dark:text-neutral-500">{document.original_filename}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Tooltip label={typeTooltip(document.type.value as DocumentTypeValue)}>
                                                <Badge>{document.type.label}</Badge>
                                            </Tooltip>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Tooltip label={classificationTooltip(document.base_classification.value)}>
                                                <Badge tone="accent">{document.base_classification.label}</Badge>
                                            </Tooltip>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-neutral-400">{document.size_label}</td>
                                        <td className="px-4 py-3">
                                            {document.uploaded_by ? (
                                                <span
                                                    title={document.uploaded_by}
                                                    aria-label={`Uploaded by ${document.uploaded_by}`}
                                                    className="inline-flex"
                                                >
                                                    <Avatar name={document.uploaded_by} className="h-7 w-7 text-[10px]" />
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-neutral-500">—</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-neutral-400">
                                            {document.updated_at ? (
                                                <time dateTime={document.updated_at} title={formatDateTime(document.updated_at)}>
                                                    {formatRelativeDate(document.updated_at)}
                                                </time>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {/* Actions live inside the clickable row, so stop the click from also navigating. */}
                                            <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                                                <Tooltip label="Download document">
                                                    <a
                                                        href={document.download_url}
                                                        className={buttonClasses('ghost', 'icon')}
                                                        aria-label="Download document"
                                                    >
                                                        <Download className="h-4 w-4" aria-hidden />
                                                    </a>
                                                </Tooltip>
                                                {project.can.update && (
                                                    <>
                                                        <Tooltip label="Edit document">
                                                            <ButtonLink
                                                                href={documentShow.url([project.id, document.id], { query: { tab: 'edit' } })}
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label="Edit document"
                                                            >
                                                                <Pencil className="h-4 w-4" aria-hidden />
                                                            </ButtonLink>
                                                        </Tooltip>
                                                        <Tooltip label="Delete document">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label="Delete document"
                                                                onClick={() => setDeleting(document)}
                                                            >
                                                                <Trash2 className="h-4 w-4" aria-hidden />
                                                            </Button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
            </div>

            <UploadDocumentModal project={project} open={uploadOpen} onClose={() => setUploadOpen(false)} options={options} />

            <ConfirmDialog
                open={deleting !== null}
                title="Delete document"
                description={deleting ? `“${deleting.name}” and its file will be permanently removed. This cannot be undone.` : undefined}
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        </AppLayout>
    );
}
