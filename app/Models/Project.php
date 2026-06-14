<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ActivityAction;
use App\Enums\DurationUnit;
use App\Enums\ProjectStatus;
use App\Enums\Role;
use App\Events\TaskUpdated;
use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use App\Support\Propagation\PropagationResult;
use App\Support\Propagation\ScheduleGraph;
use App\Support\Propagation\SchedulePropagator;
use App\Support\Propagation\TaskNode;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Scout\Searchable;

#[Fillable(['owner_id', 'name', 'description', 'start_date', 'end_date', 'status', 'base_classification', 'special_access_required', 'handling_caveats', 'programs'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasClassification, HasFactory, HasUserStamps, LogsModelActivity, Searchable, SoftDeletes;

    /**
     * The data indexed for global search. Keys map to real columns so the
     * `database` engine (prod) searches them directly; the `collection` engine
     * (dev) matches against these values. `id` is included so accessible-project
     * scoping via `whereIn('id', ...)` works under the collection engine.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
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
            'status' => ProjectStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * The project's working-time calendar (non-working weekdays, future holidays).
     * Defaults until calendar settings are persisted on the project.
     */
    public function workCalendar(): WorkCalendar
    {
        return WorkCalendar::default();
    }

    /**
     * Mirror the owner into the membership pivot so that member and
     * accessible-project queries can stay single-table. owner_id remains the
     * authoritative source of ownership.
     */
    protected static function booted(): void
    {
        static::creating(function (Project $project): void {
            if ($project->start_date === null) {
                $project->start_date = today();
            }
        });

        static::created(function (Project $project): void {
            $project->members()->syncWithoutDetaching([
                $project->owner_id => ['role' => Role::Owner->value],
            ]);
        });
    }

    /**
     * The user who owns this project. The owner is authoritative and singular;
     * invited members live on the pivot with admin/editor/viewer roles.
     *
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Every user with access to this project, with their per-project role.
     * Includes the owner (mirrored into the pivot on create).
     *
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Invitations issued for this project (pending and resolved).
     *
     * @return HasMany<ProjectInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(ProjectInvitation::class);
    }

    /**
     * Documents uploaded to this project.
     *
     * @return HasMany<Document, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Tasks belonging to this project (all tiers, flat).
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Load the project's tasks as a nested tree: root tasks with the recursive
     * `children` relation set at every tier, assembled from one query. Cheap at
     * the V1 scale cap (< 1,000 tasks), and shared by the task index and the
     * Gantt timeline so both feed off identical nested TaskResource arrays.
     * The timeline additionally eager-loads `predecessors` to draw dependency
     * lines; the index keeps the lighter default.
     *
     * @param  array<int, string>  $with
     * @return Collection<int, Task>
     */
    public function taskTree(array $with = ['creator']): Collection
    {
        $tasks = $this->tasks()->with($with)->ordered()->get();
        $byParent = $tasks->groupBy('parent_id');

        $tasks->each(function (Task $task) use ($byParent): void {
            $task->setRelation('children', $byParent->get($task->id, $task->newCollection())->values());
        });

        return $tasks->whereNull('parent_id')->values();
    }

    /**
     * Load a single task as the root of a nested tree: the given task with the
     * recursive `children` relation set at every tier, scoped to its subtree.
     * Feeds the scoped Gantt timeline the same nested TaskResource shape as
     * taskTree(), so the engine consumes identical arrays — only the membership
     * differs. Unlike taskTree() the root carries a non-null parent_id, so the
     * root is selected by id rather than the `whereNull('parent_id')` filter.
     *
     * @param  array<int, string>  $with
     * @return Collection<int, Task>
     */
    public function taskSubtree(Task $root, array $with = ['creator']): Collection
    {
        $ids = [$root->id, ...$root->descendantIds()];
        $tasks = $this->tasks()->whereIn('id', $ids)->with($with)->ordered()->get();
        $byParent = $tasks->groupBy('parent_id');

        $tasks->each(function (Task $task) use ($byParent): void {
            $task->setRelation('children', $byParent->get($task->id, $task->newCollection())->values());
        });

        return $tasks->where('id', $root->id)->values();
    }

    /**
     * Build the in-memory schedule graph the rules engine runs against: every
     * task as a TaskNode plus the finish-to-start edges, in two queries.
     *
     * @param  array<int, array<string, mixed>>  $overrides  Seed edits applied
     *                                                       in-memory before propagation, keyed by task id (start_date,
     *                                                       duration_days, duration_unit, lock flags).
     * @param  list<array{0: int, 1: int}>  $extraEdges  Not-yet-attached
     *                                                   [predecessor, successor] edges to preview.
     */
    public function scheduleGraph(array $overrides = [], array $extraEdges = []): ScheduleGraph
    {
        $nodes = [];

        foreach ($this->tasks()->orderBy('id')->get() as $task) {
            $values = array_merge($task->only([
                'parent_id', 'name', 'start_date', 'duration_days', 'duration_unit',
                'lock_start', 'lock_end', 'lock_duration',
            ]), $overrides[$task->id] ?? []);

            $start = $values['start_date'];

            $nodes[$task->id] = new TaskNode(
                id: $task->id,
                parentId: $values['parent_id'],
                name: $values['name'],
                start: $start === null ? null : CarbonImmutable::parse((string) $start)->startOfDay(),
                durationDays: (int) $values['duration_days'],
                unit: $values['duration_unit'] instanceof DurationUnit
                    ? $values['duration_unit']
                    : DurationUnit::from((string) $values['duration_unit']),
                lockStart: (bool) $values['lock_start'],
                lockEnd: (bool) $values['lock_end'],
                lockDuration: (bool) $values['lock_duration'],
            );
        }

        $edges = DB::table('task_dependencies')
            ->whereNull('deleted_at')
            ->whereIn('successor_id', array_keys($nodes))
            ->orderBy('id')
            ->get(['predecessor_id', 'successor_id'])
            ->map(fn (object $edge): array => [(int) $edge->predecessor_id, (int) $edge->successor_id])
            ->all();

        return new ScheduleGraph($nodes, array_merge($edges, $extraEdges), $this->workCalendar());
    }

    /**
     * Dry-run the rules engine against the current schedule plus the given
     * in-memory seed edits. Nothing is persisted.
     *
     * @param  array<int, array<string, mixed>>  $overrides
     * @param  list<array{0: int, 1: int}>  $extraEdges
     */
    public function previewSchedule(array $overrides = [], array $extraEdges = []): PropagationResult
    {
        return SchedulePropagator::propagate($this->scheduleGraph($overrides, $extraEdges));
    }

    /**
     * Persist the engine's cascade moves. Each moved task gets a single
     * schedule_propagated audit entry attributing the cause (Spatie's
     * attribute logger is disabled for the write so the trail isn't doubled)
     * and dispatches TaskUpdated so the move rides the event bus. The seed
     * task the user edited directly is persisted by its controller, not here.
     */
    public function commitSchedule(PropagationResult $result, Task $cause): void
    {
        $moves = $result->movesExcept($cause->id);

        if ($moves === []) {
            return;
        }

        DB::transaction(function () use ($moves, $cause): void {
            $tasks = $this->tasks()->whereIn('id', array_keys($moves))->get()->keyBy('id');

            foreach ($moves as $taskId => $move) {
                $task = $tasks->get($taskId);

                if ($task === null) {
                    continue;
                }

                $attributes = [
                    'start_date' => $move->toStart,
                    'duration_days' => $move->toDuration,
                ];

                if ($move->unitChanged()) {
                    $attributes['duration_unit'] = $move->toUnit;
                }

                $task->disableLogging();
                $task->update($attributes);
                $task->enableLogging();

                $task->logAction(ActivityAction::SchedulePropagated, array_filter([
                    'reason' => $move->reason,
                    'caused_by_task_id' => $cause->id,
                    'caused_by_task' => $cause->name,
                    'pushed_by_task' => $move->causedByName,
                    'old_start' => $move->fromStart,
                    'new_start' => $move->toStart,
                    'old_duration' => $move->fromDuration,
                    'new_duration' => $move->toDuration,
                ], fn (mixed $value): bool => $value !== null));

                TaskUpdated::dispatch($task);
            }
        });
    }

    /**
     * Determine whether the given user owns this project.
     */
    public function isOwner(User $user): bool
    {
        return $this->owner_id === $user->id;
    }

    /**
     * Resolve the role a given user holds on this project, if any.
     */
    public function roleFor(User $user): ?Role
    {
        if ($this->isOwner($user)) {
            return Role::Owner;
        }

        $membership = $this->members()
            ->where('users.id', $user->id)
            ->first();

        return $membership === null
            ? null
            : Role::from($membership->pivot->role);
    }

    /**
     * Determine whether the given user is the owner or an invited member.
     */
    public function isMember(User $user): bool
    {
        return $this->isOwner($user)
            || $this->members()->where('users.id', $user->id)->exists();
    }

    /**
     * Change an invited member's role. The owner is authoritative and cannot be
     * demoted, regardless of the requester's role.
     */
    public function updateMemberRole(User $member, Role $role): void
    {
        abort_if($this->isOwner($member), 403, 'The project owner cannot be modified.');

        $this->members()->updateExistingPivot($member->id, ['role' => $role->value]);
    }

    /**
     * Remove an invited member. The owner cannot be removed.
     */
    public function removeMember(User $member): void
    {
        abort_if($this->isOwner($member), 403, 'The project owner cannot be modified.');

        $this->members()->detach($member->id);
    }
}
