import Button from '@/components/ui/button';
import FileDropzone from '@/components/ui/file-dropzone';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Label from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import { store as documentStore } from '@/routes/projects/documents';
import { CLASSIFICATIONS, type BaseClassificationValue, type Project } from '@/types';
import { formatFileSize } from '@/utils/format';
import { useForm } from '@inertiajs/react';
import { FileText, X } from 'lucide-react';
import { type FormEvent } from 'react';

type UploadDocumentModalProps = {
    project: Project;
    open: boolean;
    onClose: () => void;
    options: typeof CLASSIFICATIONS;
};

type FileMetaEntry = {
    description: string;
    base_classification: BaseClassificationValue | '';
};

type UploadFormData = {
    files: File[];
    file_meta: FileMetaEntry[];
    name: string;
    description: string;
    base_classification: BaseClassificationValue;
};

function emptyFileMeta(): FileMetaEntry {
    return { description: '', base_classification: '' };
}

function fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

function syncFileMeta(files: File[], previousFiles: File[], previousMeta: FileMetaEntry[]): FileMetaEntry[] {
    return files.map((file) => {
        const previousIndex = previousFiles.findIndex((candidate) => fileKey(candidate) === fileKey(file));

        if (previousIndex >= 0 && previousMeta[previousIndex]) {
            return previousMeta[previousIndex];
        }

        return emptyFileMeta();
    });
}

function firstFileError(errors: Partial<Record<string, string>>): string | undefined {
    if (errors.files) {
        return errors.files;
    }

    if (errors.file) {
        return errors.file;
    }

    const key = Object.keys(errors).find((errorKey) => errorKey.startsWith('files.'));

    return key ? errors[key] : undefined;
}

export default function UploadDocumentModal({ project, open, onClose, options }: UploadDocumentModalProps) {
    const form = useForm<UploadFormData>({
        files: [],
        file_meta: [],
        name: '',
        description: '',
        base_classification: 'unclassified',
    });

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const updateFiles = (files: File[]) => {
        form.setData((current) => ({
            ...current,
            files,
            file_meta: syncFileMeta(files, current.files, current.file_meta),
        }));
    };

    const removeFile = (index: number) => {
        form.setData((current) => ({
            ...current,
            files: current.files.filter((_, fileIndex) => fileIndex !== index),
            file_meta: current.file_meta.filter((_, metaIndex) => metaIndex !== index),
        }));
    };

    const updateFileMeta = (index: number, patch: Partial<FileMetaEntry>) => {
        form.setData(
            'file_meta',
            form.data.file_meta.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.post(documentStore.url(project.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    const fileCount = form.data.files.length;
    const singleFile = fileCount === 1;

    return (
        <Modal open={open} onClose={handleClose} title="Upload documents" size="xl">
            <form onSubmit={submit} className="flex max-h-[calc(90vh-5rem)] flex-col gap-5 overflow-y-auto pr-1">
                <FileDropzone
                    files={form.data.files}
                    onChange={updateFiles}
                    disabled={form.processing}
                    error={firstFileError(form.errors)}
                    showFileList={false}
                />

                {fileCount > 0 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-slate-600 dark:text-neutral-300">Selected files</p>

                        <div className="overflow-hidden rounded-lg border border-border dark:border-border-dark">
                            <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,2fr)_minmax(10rem,1fr)_2.5rem] items-center gap-3 border-b border-border bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 dark:border-border-dark dark:bg-neutral-800/60 dark:text-neutral-400">
                                <span>File</span>
                                <span>Description</span>
                                <span>Classification</span>
                                <span className="sr-only">Remove</span>
                            </div>

                            {form.data.files.map((file, index) => {
                                const meta = form.data.file_meta[index] ?? emptyFileMeta();

                                return (
                                    <div
                                        key={`${fileKey(file)}-${index}`}
                                        className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,2fr)_minmax(10rem,1fr)_2.5rem] items-start gap-3 border-b border-border px-4 py-3 last:border-b-0 dark:border-border-dark"
                                    >
                                        <div className="flex min-w-0 items-start gap-2">
                                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-neutral-400">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <Label htmlFor={`file-${index}-description`} className="sr-only">
                                                Description for {file.name}
                                            </Label>
                                            <Input
                                                id={`file-${index}-description`}
                                                value={meta.description}
                                                onChange={(event) =>
                                                    updateFileMeta(index, { description: event.target.value })
                                                }
                                                placeholder="Uses shared default"
                                                disabled={form.processing}
                                            />
                                            <InputError message={form.errors[`file_meta.${index}.description`]} className="mt-1" />
                                        </div>

                                        <div className="min-w-0">
                                            <Label htmlFor={`file-${index}-classification`} className="sr-only">
                                                Classification for {file.name}
                                            </Label>
                                            <Select
                                                id={`file-${index}-classification`}
                                                value={meta.base_classification}
                                                onChange={(event) =>
                                                    updateFileMeta(index, {
                                                        base_classification: event.target.value as BaseClassificationValue | '',
                                                    })
                                                }
                                                disabled={form.processing}
                                            >
                                                <option value="">Use shared default</option>
                                                {options.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Select>
                                            <InputError message={form.errors[`file_meta.${index}.base_classification`]} className="mt-1" />
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            aria-label={`Remove ${file.name}`}
                                            disabled={form.processing}
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-4 w-4" aria-hidden />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4 rounded-lg border border-border bg-slate-50/50 p-4 dark:border-border-dark dark:bg-neutral-800/40">
                    <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-neutral-300">Shared defaults</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                            Applied to any file whose fields above are left blank.
                        </p>
                    </div>

                    {singleFile && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="document-name">Display name</Label>
                            <Input
                                id="document-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                placeholder="Defaults to the file name"
                                disabled={form.processing}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="document-description">Description</Label>
                        <Textarea
                            id="document-description"
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            placeholder="Optional notes for all files"
                            disabled={form.processing}
                            rows={3}
                        />
                        <InputError message={form.errors.description} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="document-classification">
                            Classification <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            id="document-classification"
                            value={form.data.base_classification}
                            onChange={(event) =>
                                form.setData('base_classification', event.target.value as BaseClassificationValue)
                            }
                            disabled={form.processing}
                            required
                        >
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <InputError message={form.errors.base_classification} />
                    </div>
                </div>

                {form.progress && (
                    <div className="h-1 w-full overflow-hidden rounded bg-slate-100 dark:bg-neutral-800">
                        <div
                            className="h-full bg-accent-600 transition-all dark:bg-accent-500"
                            style={{ width: `${form.progress.percentage ?? 0}%` }}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={form.processing}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing || fileCount === 0}>
                        {fileCount <= 1 ? 'Upload' : `Upload ${fileCount} files`}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
