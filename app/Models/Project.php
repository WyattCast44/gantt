<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProjectStatus;
use App\Enums\Role;
use App\Models\Concerns\HasClassification;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['owner_id', 'name', 'description', 'start_date', 'end_date', 'status', 'base_classification', 'special_access_required', 'handling_caveats', 'programs'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasClassification, HasFactory, HasUserStamps, LogsModelActivity, SoftDeletes;

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
     * Mirror the owner into the membership pivot so that member and
     * accessible-project queries can stay single-table. owner_id remains the
     * authoritative source of ownership.
     */
    protected static function booted(): void
    {
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
