<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

trait HasUserStamps
{
    public static function bootHasUserStamps(): void
    {
        static::creating(function (Model $model): void {
            if (Auth::check()) {
                $id = Auth::id();
                $model->created_by ??= $id;
                $model->updated_by ??= $id;
            }
        });

        static::updating(function (Model $model): void {
            if (Auth::check()) {
                $model->updated_by = Auth::id();
            }
        });

        if (in_array(SoftDeletes::class, class_uses_recursive(static::class))) {
            static::deleting(function (Model $model): void {
                if (Auth::check() && ! $model->isForceDeleting()) {
                    $model->updateQuietly(['deleted_by' => Auth::id()]);
                }
            });
        }
    }

    public function creator(): BelongsTo
    {
        /** @var Model<self> $this */
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        /** @var Model<self> $this */
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter(): BelongsTo
    {
        /** @var Model<self> $this */
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
