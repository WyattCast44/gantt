import { type BaseClassificationValue } from '@/types';

export type DocumentTypeValue = 'pdf' | 'image' | 'spreadsheet' | 'document' | 'other';

/** Hover tooltip explaining a document type badge. */
export function typeTooltip(type: DocumentTypeValue): string {
    const descriptions: Record<DocumentTypeValue, string> = {
        pdf: 'PDF document, previewable in the browser',
        image: 'Image file, previewable in the browser',
        spreadsheet: 'Spreadsheet or CSV data file',
        document: 'Word or plain-text document',
        other: 'General file attachment',
    };

    return `File type — ${descriptions[type]}`;
}

/** Hover tooltip explaining a classification badge. */
export function classificationTooltip(classification: BaseClassificationValue): string {
    const descriptions: Record<BaseClassificationValue, string> = {
        unclassified: 'No classification restrictions apply',
        cui: 'Controlled unclassified information — handle per CUI policy',
        confidential: 'Confidential — limited to authorized personnel',
        secret: 'Secret — restricted to cleared personnel on need-to-know',
        top_secret: 'Top Secret — highest restriction level',
    };

    return `Classification — ${descriptions[classification]}`;
}
