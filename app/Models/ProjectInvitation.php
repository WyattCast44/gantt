<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\InvitationStatus;
use App\Enums\Role;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use Database\Factories\ProjectInvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[Fillable(['project_id', 'inviter_id', 'email', 'role', 'token', 'status', 'expires_at'])]
class ProjectInvitation extends Model
{
    /** @use HasFactory<ProjectInvitationFactory> */
    use HasFactory, HasUserStamps, LogsModelActivity, SoftDeletes;

    /**
     * Number of days a pending invitation remains valid after it is issued.
     */
    public const int EXPIRY_DAYS = 14;

    /**
     * Fill in the token, status, and expiry defaults when not explicitly set,
     * so callers only need to provide project/inviter/email/role.
     */
    protected static function booted(): void
    {
        static::creating(function (ProjectInvitation $invitation): void {
            $invitation->token ??= Str::random(64);
            $invitation->status ??= InvitationStatus::Pending;
            $invitation->expires_at ??= now()->addDays(self::EXPIRY_DAYS);
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'status' => InvitationStatus::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'declined_at' => 'datetime',
            'revoked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * The project this invitation grants access to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The user who issued this invitation, if still on record.
     *
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_id');
    }

    /**
     * The user who accepted this invitation, if any.
     *
     * @return BelongsTo<User, $this>
     */
    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    /**
     * Whether the invitation has passed its expiry while still pending.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Whether the invitation can still be accepted or declined: pending and not
     * yet expired. Accepted/declined/revoked or expired invitations are inert.
     */
    public function isActionable(): bool
    {
        return $this->status === InvitationStatus::Pending && ! $this->isExpired();
    }

    /**
     * Scope to pending, non-expired invitations.
     *
     * @param  Builder<ProjectInvitation>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->where('status', InvitationStatus::Pending)
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    /**
     * Scope to invitations addressed to the given email (case-insensitive).
     *
     * @param  Builder<ProjectInvitation>  $query
     */
    public function scopeForEmail(Builder $query, string $email): void
    {
        $query->where('email', strtolower($email));
    }

    /**
     * Accept the invitation: attach the user as a member (idempotent) and mark
     * it accepted, within a single transaction.
     */
    public function accept(User $user): void
    {
        abort_unless($this->isActionable(), 410, 'This invitation is no longer available.');

        DB::transaction(function () use ($user): void {
            if (! $this->project->isMember($user)) {
                $this->project->members()->attach($user->id, ['role' => $this->role->value]);
            }

            $this->status = InvitationStatus::Accepted;
            $this->accepted_at = now();
            $this->accepted_by = $user->id;
            $this->save();
        });
    }

    /**
     * Decline a pending invitation.
     */
    public function decline(): void
    {
        abort_unless($this->isActionable(), 410, 'This invitation is no longer available.');

        $this->status = InvitationStatus::Declined;
        $this->declined_at = now();
        $this->save();
    }

    /**
     * Revoke a pending invitation (manager action).
     */
    public function revoke(): void
    {
        abort_unless($this->status === InvitationStatus::Pending, 410, 'This invitation is no longer pending.');

        $this->status = InvitationStatus::Revoked;
        $this->revoked_at = now();
        $this->save();
    }
}
