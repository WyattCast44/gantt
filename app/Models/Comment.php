<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Only user-editable fields are mass-assignable; the commentable association is
 * set via the relationship (e.g. $document->comments()->create(...)), never
 * from request input.
 */
#[Fillable(['body', 'base_classification'])]
class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use HasClassification, HasFactory, HasUserStamps, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * The model this comment is attached to (a Document today; Tasks in Phase 6).
     *
     * @return MorphTo<Model, $this>
     */
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}
