import Avatar from '@/components/ui/avatar';
import Badge from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import SectionNav, { type SectionNavItem } from '@/components/ui/section-nav';
import EditDocumentForm from '@/Pages/Documents/Partials/EditDocumentForm';
import AppLayout from '@/layouts/app-layout';
import { destroy as documentDestroy, index as documentsIndex, show as documentShow } from '@/routes/projects/documents';
import { type BaseClassificationValue, type Document, type Project } from '@/types';
import { allowedClassifications } from '@/utils/classification';
import { formatDateTime } from '@/utils/date';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, Eye, FileText, Info, Pencil } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

type TabKey = 'preview' | 'details' | 'edit';

function useActiveTab(canEdit: boolean): TabKey {
    const page = usePage();
    const tab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');

    if (tab === 'edit') {
        return canEdit ? 'edit' : 'preview';
    }

    return tab === 'details' ? 'details' : 'preview';
}

function PreviewPane({ document }: { document: Document }) {
    if (document.type.value === 'image') {
        return (
            <Card className="flex justify-center">
                <img src={document.preview_url} alt={document.name} className="max-h-[70vh] rounded" />
            </Card>
        );
    }

    if (document.type.value === 'pdf') {
        return (
            <Card padding="none" className="overflow-hidden">
                <iframe title={document.name} src={document.preview_url} className="h-[75vh] w-full border-0" />
            </Card>
        );
    }

    return (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-8 w-8 text-slate-300 dark:text-neutral-600" aria-hidden />
            <p className="text-sm text-slate-600 dark:text-neutral-400">No preview available for this file type.</p>
            <a href={document.download_url} className={buttonClasses('secondary')}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Download
            </a>
        </Card>
    );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:gap-4 dark:border-border-dark">
            <dt className="text-sm text-slate-500 sm:w-44 sm:shrink-0 dark:text-neutral-400">{label}</dt>
            <dd className="min-w-0 text-sm text-slate-900 dark:text-white">{children}</dd>
        </div>
    );
}

function DetailsPane({ document }: { document: Document }) {
    return (
        <Card padding="none">
            <dl>
                <DetailRow label="Original filename">{document.original_filename}</DetailRow>
                <DetailRow label="Type">
                    <Badge>{document.type.label}</Badge>
                </DetailRow>
                <DetailRow label="Classification">
                    <Badge tone="accent">{document.base_classification.label}</Badge>
                </DetailRow>
                <DetailRow label="Size">{document.size_label}</DetailRow>
                <DetailRow label="Uploaded by">
                    {document.uploaded_by ? (
                        <span className="inline-flex items-center gap-2">
                            <Avatar name={document.uploaded_by} className="h-6 w-6 text-[10px]" />
                            {document.uploaded_by}
                        </span>
                    ) : (
                        '—'
                    )}
                </DetailRow>
                <DetailRow label="Uploaded">{document.created_at ? formatDateTime(document.created_at) : '—'}</DetailRow>
                <DetailRow label="Last updated">{document.updated_at ? formatDateTime(document.updated_at) : '—'}</DetailRow>
                <DetailRow label="Description">
                    {document.description ? (
                        <span className="whitespace-pre-wrap">{document.description}</span>
                    ) : (
                        <span className="text-slate-400 dark:text-neutral-500">No description.</span>
                    )}
                </DetailRow>
            </dl>
        </Card>
    );
}

export default function Show({ project, document }: { project: Project; document: Document }) {
    const canEdit = project.can.update;
    const tab = useActiveTab(canEdit);
    const showUrl = documentShow.url([project.id, document.id]);
    const [deleting, setDeleting] = useState(false);

    const options = useMemo(
        () => allowedClassifications(project.base_classification.value as BaseClassificationValue),
        [project.base_classification.value],
    );

    const deleteForm = useForm({});

    const tabs: SectionNavItem<TabKey>[] = [
        { key: 'preview', label: 'Preview', href: showUrl, icon: Eye },
        { key: 'details', label: 'Details', href: `${showUrl}?tab=details`, icon: Info },
        ...(canEdit ? [{ key: 'edit' as const, label: 'Edit', href: `${showUrl}?tab=edit`, icon: Pencil }] : []),
    ];

    return (
        <AppLayout title={document.name} project={project}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <Link
                            href={documentsIndex.url(project.id)}
                            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Documents
                        </Link>
                        <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                            {document.name}
                        </h1>
                    </div>

                    <a href={document.download_url} className={buttonClasses('primary')}>
                        <Download className="mr-2 h-4 w-4" aria-hidden />
                        Download
                    </a>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row">
                    <SectionNav items={tabs} activeKey={tab} />

                    <div className="min-w-0 flex-1">
                        {tab === 'preview' && <PreviewPane document={document} />}
                        {tab === 'details' && <DetailsPane document={document} />}
                        {tab === 'edit' && canEdit && (
                            <div className="flex flex-col gap-6">
                                <Card>
                                    <EditDocumentForm project={project} document={document} options={options} />
                                </Card>

                                <Card className="flex flex-col gap-3 border-red-200 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/40">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Delete document</p>
                                        <p className="text-sm text-slate-500 dark:text-neutral-400">
                                            Permanently removes this document and its file.
                                        </p>
                                    </div>
                                    <Button variant="danger" onClick={() => setDeleting(true)}>
                                        Delete
                                    </Button>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleting}
                title="Delete document"
                description={`“${document.name}” and its file will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={() => deleteForm.delete(documentDestroy.url([project.id, document.id]))}
                onCancel={() => setDeleting(false)}
            />
        </AppLayout>
    );
}
