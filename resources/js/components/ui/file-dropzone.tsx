import Button from '@/components/ui/button';
import InputError from '@/components/ui/input-error';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { formatFileSize } from '@/utils/format';
import { FileText, Upload, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';

const defaultAccept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt';

type FileDropzoneProps = {
    files: File[];
    onChange: (files: File[]) => void;
    disabled?: boolean;
    error?: string;
    accept?: string;
    multiple?: boolean;
    showFileList?: boolean;
};

function mergeFiles(existing: File[], incoming: FileList | File[]): File[] {
    const next = [...existing];

    for (const file of Array.from(incoming)) {
        const duplicate = next.some(
            (candidate) =>
                candidate.name === file.name &&
                candidate.size === file.size &&
                candidate.lastModified === file.lastModified,
        );

        if (!duplicate) {
            next.push(file);
        }
    }

    return next;
}

export default function FileDropzone({
    files,
    onChange,
    disabled = false,
    error,
    accept = defaultAccept,
    multiple = true,
    showFileList = true,
}: FileDropzoneProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const addFiles = (incoming: FileList | File[]) => {
        const merged = mergeFiles(files, incoming);
        onChange(multiple ? merged : merged.slice(-1));
    };

    const removeFile = (index: number) => {
        onChange(files.filter((_, fileIndex) => fileIndex !== index));
    };

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();

        if (!disabled) {
            setDragging(true);
        }
    };

    const onDragLeave = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);

        if (disabled || event.dataTransfer.files.length === 0) {
            return;
        }

        addFiles(event.dataTransfer.files);
    };

    return (
        <div className="flex flex-col gap-3">
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={cn(
                    'relative rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
                    dragging
                        ? 'border-accent-400 bg-accent-50/60 dark:border-accent-500 dark:bg-accent-500/10'
                        : 'border-border bg-slate-50/50 dark:border-border-dark dark:bg-neutral-800/40',
                    disabled && 'pointer-events-none opacity-60',
                )}
            >
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                    className="sr-only"
                    onChange={(event) => {
                        if (event.target.files) {
                            addFiles(event.target.files);
                        }

                        event.target.value = '';
                    }}
                />

                <Upload className="mx-auto h-8 w-8 text-slate-400 dark:text-neutral-500" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                    {dragging ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    PDF, images, Office docs, CSV, or plain text — up to 50 MB each
                </p>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={cn('mt-4', focusRingNeutral)}
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                >
                    Browse files
                </Button>
            </div>

            {showFileList && files.length > 0 && (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border dark:divide-border-dark dark:border-border-dark">
                    {files.map((file, index) => (
                        <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                            <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                            <div className="min-w-0 flex-1 text-left">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">{formatFileSize(file.size)}</p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={`Remove ${file.name}`}
                                disabled={disabled}
                                onClick={() => removeFile(index)}
                            >
                                <X className="h-4 w-4" aria-hidden />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <InputError message={error} />
        </div>
    );
}
