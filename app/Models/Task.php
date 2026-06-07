<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DurationUnit;
use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use App\Support\Schedule;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * Only user-editable fields are mass-assignable; structural fields (project_id,
 * parent_id, hierarchy_level, sort_order) are set explicitly by the controller
 * so the recursive shape can never be reparented or re-leveled from raw input.
 */
#[Fillable([
    'name',
    'description',
    'start_date',
    'duration_days',
    'duration_unit',
    'is_date_locked',
    'status',
    'percent_complete',
    'risk_level',
    'organization',
    'tags',
    'base_classification',
])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasClassification, HasFactory, HasUserStamps, LogsModelActivity, SoftDeletes;

    /**
     * The maximum hierarchy depth (PRD V1 decision: five tiers).
     */
    public const int MAX_DEPTH = 5;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'duration_days' => 'integer',
            'duration_unit' => DurationUnit::class,
            'is_date_locked' => 'boolean',
            'hierarchy_level' => 'integer',
            'sort_order' => 'integer',
            'status' => TaskStatus::class,
            'percent_complete' => 'integer',
            'risk_level' => RiskLevel::class,
            'tags' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Soft-delete the whole subtree when a task is deleted, so a removed parent
     * never leaves orphaned descendants. Filesystem-free multi-write lives on
     * the model (per C5). Force-deletes are left to the database cascade.
     */
    protected static function booted(): void
    {
        static::deleting(function (Task $task): void {
            if ($task->isForceDeleting()) {
                return;
            }

            $task->load('children');

            $task->children->each(fn (Task $child) => $child->delete());
        });
    }

    /**
     * The project this task belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The parent task, if this is a subtask.
     *
     * @return BelongsTo<Task, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /**
     * The direct child tasks, in sibling order.
     *
     * @return HasMany<Task, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id')->ordered();
    }

    /**
     * The comments attached to this task.
     *
     * @return MorphMany<Comment, $this>
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    /**
     * Project documents attached to this task.
     *
     * @return BelongsToMany<Document, $this>
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'document_task')->withTimestamps();
    }

    /**
     * Predecessor tasks this task depends on (finish-to-start). Added in 6f.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function predecessors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'successor_id', 'predecessor_id')
            ->withPivot('type')
            ->withTimestamps();
    }

    /**
     * Tasks that depend on this task finishing.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function successors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'predecessor_id', 'successor_id')
            ->withPivot('type')
            ->withTimestamps();
    }

    /**
     * Scope the query to tasks belonging to the given project.
     *
     * @param  Builder<Task>  $query
     */
    public function scopeForProject(Builder $query, Project $project): void
    {
        $query->where('project_id', $project->id);
    }

    /**
     * Scope the query to top-level tasks (no parent).
     *
     * @param  Builder<Task>  $query
     */
    public function scopeRoots(Builder $query): void
    {
        $query->whereNull('parent_id');
    }

    /**
     * Scope the query to sibling display order.
     *
     * @param  Builder<Task>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order');
    }

    /**
     * The derived end date at day-grain resolution. Calendar-day tasks add
     * duration − 1 calendar days; work-day tasks count only working days on the
     * project's calendar (see {@see Project::workCalendar()}).
     */
    public function endDate(): ?CarbonImmutable
    {
        if ($this->start_date === null) {
            return null;
        }

        $calendar = $this->relationLoaded('project')
            ? $this->project->workCalendar()
            : WorkCalendar::default();

        return Schedule::endDate(
            $this->start_date,
            $this->duration_days,
            $this->duration_unit,
            $calendar,
        );
    }

    /**
     * Whether this task may have children (it is not already at max depth).
     */
    public function canHaveChildren(): bool
    {
        return $this->hierarchy_level < self::MAX_DEPTH;
    }

    /**
     * Whether any descendant (excluding this task) is not complete.
     */
    public function hasIncompleteDescendants(): bool
    {
        $descendantIds = $this->descendantIds();

        if ($descendantIds === []) {
            return false;
        }

        return static::query()
            ->whereIn('id', $descendantIds)
            ->where('status', '!=', TaskStatus::Complete)
            ->exists();
    }

    /**
     * Mark this task complete, optionally cascading to all descendants.
     *
     * @return list<Task> The tasks that were updated (including this one).
     */
    public function markComplete(bool $includeSubtasks = false): array
    {
        $ids = [$this->id];

        if ($includeSubtasks) {
            $ids = array_merge($ids, $this->descendantIds());
        }

        $updated = static::query()->whereIn('id', $ids)->get();

        foreach ($updated as $task) {
            $task->update([
                'status' => TaskStatus::Complete,
                'percent_complete' => 100,
            ]);
        }

        return $updated->all();
    }

    /**
     * All descendant task IDs in breadth-first order.
     *
     * @return list<int>
     */
    public function descendantIds(): array
    {
        $ids = [];
        $queue = $this->children()->pluck('id')->all();

        while ($queue !== []) {
            $id = array_shift($queue);
            $ids[] = (int) $id;
            $queue = array_merge(
                $queue,
                static::query()->where('parent_id', $id)->pluck('id')->all(),
            );
        }

        return $ids;
    }

    /**
     * Whether adding the given predecessor (edge: predecessor -> this) would
     * close a cycle in the finish-to-start graph. A cycle forms when the
     * candidate predecessor is already a transitive successor of this task.
     * V1 blocks the edge rather than propagating (FR-6).
     */
    public function wouldCreateCycle(Task $predecessor): bool
    {
        if ($predecessor->id === $this->id) {
            return true;
        }

        $stack = [$this->id];
        $visited = [];

        while ($stack !== []) {
            $currentId = array_pop($stack);

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;

            $successorIds = DB::table('task_dependencies')
                ->where('predecessor_id', $currentId)
                ->pluck('successor_id');

            foreach ($successorIds as $successorId) {
                if ((int) $successorId === $predecessor->id) {
                    return true;
                }

                $stack[] = $successorId;
            }
        }

        return false;
    }
}
