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
use Laravel\Scout\Searchable;
use Spatie\EloquentSortable\Sortable;
use Spatie\EloquentSortable\SortableTrait;

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
    'lock_start',
    'lock_end',
    'lock_duration',
    'status',
    'percent_complete',
    'risk_level',
    'organization',
    'tags',
    'base_classification',
])]
class Task extends Model implements Sortable
{
    /** @use HasFactory<TaskFactory> */
    use HasClassification, HasFactory, HasUserStamps, LogsModelActivity, Searchable, SoftDeletes, SortableTrait;

    /**
     * The maximum hierarchy depth (PRD V1 decision: five tiers).
     */
    public const int MAX_DEPTH = 5;

    /**
     * The data indexed for global search. `project_id` is included so
     * accessible-project scoping via `whereIn('project_id', ...)` works under the
     * collection engine (dev); the `database` engine (prod) searches the text
     * columns directly. `tags` is a JSON column, LIKE-matched as text.
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
            'organization' => $this->organization,
            'tags' => $this->tags,
        ];
    }

    /**
     * Sortable config: order on `sort_order`. Creation order is set explicitly
     * by the controller, so the package does not auto-order on create. Ordering
     * is sibling-relative via {@see buildSortQuery()}.
     *
     * @var array<string, mixed>
     */
    public array $sortable = [
        'order_column_name' => 'sort_order',
        'sort_when_creating' => false,
    ];

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
            'lock_start' => 'boolean',
            'lock_end' => 'boolean',
            'lock_duration' => 'boolean',
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
     *
     * The saving hook is the safety net for the lock invariant (at most two of
     * start/end/duration may be locked — locking two derives the third); the
     * FormRequests give the user-facing message.
     */
    protected static function booted(): void
    {
        static::saving(function (Task $task): void {
            if ($task->lockCount() > 2) {
                throw new \LogicException('At most two of start, end, and duration may be locked.');
            }
        });

        // Roll progress up to the parent: its percent/status are the derived
        // average of its children. A new child shifts the average; an updated
        // child only matters when its progress moved. Recomputing the parent
        // updates it in turn, so the roll-up walks the parent_id chain to the
        // root. The parent is resolved by id (lazy loading is disabled app-wide).
        static::created(function (Task $task): void {
            $task->rollUpToParent();
        });

        static::updated(function (Task $task): void {
            if ($task->wasChanged('percent_complete') || $task->wasChanged('status')) {
                $task->rollUpToParent();
            }
        });

        static::deleting(function (Task $task): void {
            if ($task->isForceDeleting()) {
                return;
            }

            $task->load('children');

            $task->children->each(fn (Task $child) => $child->delete());
        });

        // Removing a child changes the parent's average; recompute it.
        static::deleted(function (Task $task): void {
            $task->rollUpToParent();
        });
    }

    /**
     * Recompute this task's parent (if any) from its children. Resolves the
     * parent by id rather than the relation so it works under disabled lazy
     * loading and reflects the current persisted child set.
     */
    private function rollUpToParent(): void
    {
        if ($this->parent_id !== null) {
            static::find($this->parent_id)?->recomputeProgressFromChildren();
        }
    }

    /**
     * Recompute this (parent) task's progress from the simple average of its
     * direct children — completion rolls up the hierarchy. A task with no
     * children is a leaf and keeps its own manually-entered values.
     */
    public function recomputeProgressFromChildren(): void
    {
        $children = $this->children()->get(['id', 'percent_complete', 'status']);

        if ($children->isEmpty()) {
            return;
        }

        $percent = (int) round($children->avg('percent_complete'));

        $allComplete = $children->every(fn (Task $child): bool => $child->status === TaskStatus::Complete);
        $allNotStarted = $children->every(fn (Task $child): bool => $child->percent_complete === 0);

        if ($allComplete) {
            $status = TaskStatus::Complete;
        } elseif ($allNotStarted) {
            $status = TaskStatus::NotStarted;
        } else {
            $status = TaskStatus::InProgress;
            // "100%" must always mean done: never round a still-open parent to 100.
            $percent = min($percent, 99);
        }

        if ($this->percent_complete === $percent && $this->status === $status) {
            return;
        }

        $this->update([
            'percent_complete' => $percent,
            'status' => $status,
        ]);
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
     * Restrict sortable neighbour logic to this task's sibling group (same
     * project and parent), so reordering is sibling-relative.
     *
     * @return Builder<Task>
     */
    public function buildSortQuery(): Builder
    {
        return static::query()
            ->where('project_id', $this->project_id)
            ->where('parent_id', $this->parent_id);
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
     * The ids of loaded predecessors whose finish-to-start constraint this
     * task currently violates (it starts on or before they end). Derived
     * state, never stored — this is the read-side mirror of the engine's
     * ScheduleGraph::conflicts(). Requires `predecessors` to be eager-loaded.
     *
     * @return list<int>
     */
    public function scheduleConflictIds(): array
    {
        if ($this->start_date === null) {
            return [];
        }

        $conflicts = [];

        foreach ($this->predecessors as $predecessor) {
            $predecessorEnd = $predecessor->endDate();

            if ($predecessorEnd !== null && $this->start_date->lessThanOrEqualTo($predecessorEnd)) {
                $conflicts[] = $predecessor->id;
            }
        }

        return $conflicts;
    }

    /**
     * How many of the three schedule fields (start, end, duration) are locked.
     */
    public function lockCount(): int
    {
        return (int) $this->lock_start + (int) $this->lock_end + (int) $this->lock_duration;
    }

    /**
     * Whether the schedule is fully pinned: two locks fix all three fields, so
     * the rules engine may never move this task automatically.
     */
    public function isFullyPinned(): bool
    {
        return $this->lockCount() >= 2;
    }

    /**
     * Whether the start date is fixed — locked directly, or derived as fixed
     * because both end and duration are locked. A pinned start means dependency
     * pushes conflict rather than move this task.
     */
    public function startIsPinned(): bool
    {
        return $this->lock_start || ($this->lock_end && $this->lock_duration);
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
     * close a cycle in the finish-to-start graph (FR-6). The check is
     * hierarchy-aware: pushing this task moves its subtree and grows its
     * ancestors' envelopes, so an edge is also illegal when that coupling
     * could feed a schedule change back into the candidate predecessor.
     */
    public function wouldCreateCycle(Task $predecessor): bool
    {
        $project = $this->relationLoaded('project')
            ? $this->project
            : $this->project()->firstOrFail();

        return $project->scheduleGraph()->wouldLoop($predecessor->id, $this->id);
    }

    /**
     * Whether this task and the other share an ancestor/descendant line in the
     * hierarchy (either direction). Dependencies between a task and its own
     * subtree or ancestors are forbidden — the hierarchy already couples them.
     */
    public function sharesLineageWith(Task $other): bool
    {
        if ($this->id === $other->id) {
            return true;
        }

        return in_array($other->id, $this->descendantIds(), true)
            || in_array($this->id, $other->descendantIds(), true);
    }
}
