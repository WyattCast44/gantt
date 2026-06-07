<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use App\Enums\ThemePreference;
use App\Models\Concerns\HasUserStamps;
use App\Models\Concerns\LogsModelActivity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'theme'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUserStamps, LogsModelActivity, Notifiable, SoftDeletes;

    /**
     * Attributes excluded from the activity log — the password hash must never
     * be recorded in the audit trail. (remember_token is not fillable, so it is
     * already outside the logged set.)
     *
     * @var array<int, string>
     */
    protected array $activityLogExcept = ['password'];

    /**
     * The model's default attribute values.
     *
     * Mirrors the column default so a freshly created (not-yet-reloaded) user
     * always has a theme, keeping shared Inertia props non-null.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'theme' => ThemePreference::System->value,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'theme' => ThemePreference::class,
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * The projects this user owns.
     *
     * @return HasMany<Project, $this>
     */
    public function ownedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'owner_id');
    }

    /**
     * The projects this user has been invited to, with their per-project role.
     *
     * @return BelongsToMany<Project, $this>
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class)
            ->withPivot('role')
            ->withTimestamps();
    }
}
