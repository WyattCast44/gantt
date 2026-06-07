<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\InvitationStatus;
use App\Enums\Role;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectInvitation>
 */
class ProjectInvitationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'inviter_id' => User::factory(),
            'email' => fake()->unique()->safeEmail(),
            'role' => Role::Editor,
            'token' => Str::random(64),
            'status' => InvitationStatus::Pending,
            'expires_at' => now()->addDays(ProjectInvitation::EXPIRY_DAYS),
            'accepted_at' => null,
            'declined_at' => null,
            'revoked_at' => null,
            'accepted_by' => null,
        ];
    }

    /**
     * An explicitly pending, non-expired invitation.
     */
    public function pending(): static
    {
        return $this->state([
            'status' => InvitationStatus::Pending,
            'expires_at' => now()->addDays(ProjectInvitation::EXPIRY_DAYS),
        ]);
    }

    /**
     * An accepted invitation, optionally tied to the accepting user.
     */
    public function accepted(?User $user = null): static
    {
        return $this->state([
            'status' => InvitationStatus::Accepted,
            'accepted_at' => now(),
            'accepted_by' => $user?->id ?? User::factory(),
        ]);
    }

    /**
     * A declined invitation.
     */
    public function declined(): static
    {
        return $this->state([
            'status' => InvitationStatus::Declined,
            'declined_at' => now(),
        ]);
    }

    /**
     * A revoked invitation.
     */
    public function revoked(): static
    {
        return $this->state([
            'status' => InvitationStatus::Revoked,
            'revoked_at' => now(),
        ]);
    }

    /**
     * A still-pending invitation whose expiry has lapsed.
     */
    public function expired(): static
    {
        return $this->state([
            'status' => InvitationStatus::Pending,
            'expires_at' => now()->subDay(),
        ]);
    }

    /**
     * Target a specific invitee email.
     */
    public function forEmail(string $email): static
    {
        return $this->state(['email' => $email]);
    }

    /**
     * Set the role the invitation grants.
     */
    public function withRole(Role $role): static
    {
        return $this->state(['role' => $role]);
    }

    /**
     * Tie the invitation to an existing project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(['project_id' => $project->id]);
    }
}
