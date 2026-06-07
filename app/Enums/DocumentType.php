<?php

declare(strict_types=1);

namespace App\Enums;

enum DocumentType: string
{
    case Pdf = 'pdf';
    case Image = 'image';
    case Spreadsheet = 'spreadsheet';
    case Document = 'document';
    case Other = 'other';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pdf => 'PDF',
            self::Image => 'Image',
            self::Spreadsheet => 'Spreadsheet',
            self::Document => 'Document',
            self::Other => 'File',
        };
    }

    /**
     * Categorize an uploaded file's MIME type into a display group.
     */
    public static function fromMime(string $mimeType): self
    {
        return match (true) {
            $mimeType === 'application/pdf' => self::Pdf,
            str_starts_with($mimeType, 'image/') => self::Image,
            in_array($mimeType, [
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ], true) => self::Spreadsheet,
            in_array($mimeType, [
                'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ], true) => self::Document,
            default => self::Other,
        };
    }
}
