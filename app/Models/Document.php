<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BaseClassification;
use App\Enums\DocumentType;
use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Scout\Searchable;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Only user-editable fields are mass-assignable; storage metadata (disk, path,
 * mime, size, checksum) is set explicitly by the controller, never from input.
 */
#[Fillable(['name', 'description', 'base_classification'])]
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
    use HasClassification, HasFactory, HasUserStamps, LogsModelActivity, Searchable, SoftDeletes;

    /**
     * The filesystem disk documents are stored on. Config-driven (local by
     * default, swappable to s3) so the storage target lives in one place.
     */
    public const string DISK = 'documents';

    /**
     * The data indexed for global search. `project_id` is included so
     * accessible-project scoping via `whereIn('project_id', ...)` works under the
     * collection engine (dev); the `database` engine (prod) searches the text
     * columns directly.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'description' => $this->description,
            'original_filename' => $this->original_filename,
        ];
    }

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
     * Tasks this document is attached to.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'document_task')->withTimestamps();
    }

    /**
     * Store an uploaded file as a project document. The blob write and the
     * server-derived storage metadata live on the model (per C5), so both the
     * Documents upload controller and the task upload-and-attach controller
     * share one implementation rather than duplicating the file handling.
     */
    public static function storeUploadedFile(
        Project $project,
        UploadedFile $file,
        ?string $name,
        ?string $description,
        BaseClassification $classification,
    ): self {
        $path = $file->store((string) $project->id, self::DISK);

        $document = new self([
            'name' => $name !== null && $name !== '' ? $name : $file->getClientOriginalName(),
            'description' => $description,
            'base_classification' => $classification,
        ]);

        // Storage metadata is derived server-side; it is not #[Fillable].
        $document->disk = self::DISK;
        $document->path = $path;
        $document->original_filename = $file->getClientOriginalName();
        $document->mime_type = $file->getMimeType();
        $document->size_bytes = $file->getSize();
        $document->checksum = hash_file('sha256', $file->getRealPath());

        $project->documents()->save($document);

        return $document;
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
