<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentType;
use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Only user-editable fields are mass-assignable; storage metadata (disk, path,
 * mime, size, checksum) is set explicitly by the controller, never from input.
 */
#[Fillable(['name', 'description', 'base_classification'])]
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
    use HasClassification, HasFactory, HasUserStamps, SoftDeletes;

    /**
     * The filesystem disk documents are stored on. Config-driven (local by
     * default, swappable to s3) so the storage target lives in one place.
     */
    public const string DISK = 'documents';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * The project this document belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The comments attached to this document.
     *
     * @return MorphMany<Comment, $this>
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    /**
     * Scope the query to documents belonging to the given project.
     *
     * @param  Builder<Document>  $query
     */
    public function scopeForProject(Builder $query, Project $project): void
    {
        $query->where('project_id', $project->id);
    }

    /**
     * The display category derived from the stored MIME type.
     */
    public function type(): DocumentType
    {
        return DocumentType::fromMime($this->mime_type);
    }

    /**
     * Stream the underlying file to the browser as a download. File I/O lives
     * on the model (not the controller) to keep controllers within the
     * architecture allowlist.
     */
    public function download(): StreamedResponse
    {
        return Storage::disk($this->disk)->download($this->path, $this->original_filename);
    }

    /**
     * Stream the file inline for in-browser preview (images, PDFs). `nosniff`
     * stops the browser from re-interpreting the bytes as another type, and the
     * stored MIME is content-derived (set via getMimeType() at upload), so it is
     * authoritative. File I/O lives on the model to keep controllers within the
     * architecture allowlist; the private disk never exposes a public URL.
     */
    public function inline(): StreamedResponse
    {
        return Storage::disk($this->disk)->response($this->path, $this->original_filename, [
            'Content-Type' => $this->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Soft-delete the metadata row, then hard-delete the stored blob. The row
     * is committed first so a failed delete leaves the file intact (the safer
     * failure mode); the blob is hard-deleted because the soft-delete protects
     * the audit row, not the file bytes. Filesystem deletes cannot participate
     * in the DB transaction, so they run after it commits.
     */
    public function deleteWithFile(): void
    {
        DB::transaction(function (): void {
            $this->delete();
        });

        Storage::disk($this->disk)->delete($this->path);
    }
}
