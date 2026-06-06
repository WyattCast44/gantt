<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BaseClassification;
use App\Enums\ProjectStatus;
use App\Enums\Role;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-1 month', '+1 month');

        return [
            'owner_id' => User::factory(),
            'name' => fake()->unique()->catchPhrase(),
            'description' => fake()->sentence(),
            'start_date' => $start,
            'end_date' => fake()->dateTimeBetween($start, '+6 months'),
            'status' => ProjectStatus::Active,
            'base_classification' => BaseClassification::UNCLASSIFIED,
            'special_access_required' => false,
            'handling_caveats' => null,
            'programs' => null,
        ];
    }

    /**
     * Mark the project as completed.
     */
    public function completed(): static
    {
        return $this->state(['status' => ProjectStatus::Completed]);
    }

    /**
     * Set the project's baseline classification.
     */
    public function classifiedAs(BaseClassification $level): static
    {
        return $this->state(['base_classification' => $level]);
    }

    /**
     * Flag the project as requiring special access, optionally with programs.
     *
     * @param  array<int, array{name: string, level: string}>  $programs
     */
    public function withSpecialAccess(array $programs = []): static
    {
        return $this->state([
            'special_access_required' => true,
            'programs' => $programs === [] ? null : $programs,
        ]);
    }

    /**
     * Attach an invited member with the given role after the project is created.
     */
    public function withMember(User $user, Role $role): static
    {
        return $this->afterCreating(function (Project $project) use ($user, $role): void {
            $project->members()->attach($user, ['role' => $role->value]);
        });
    }

    /**
     * Set the owning user for the project.
     */
    public function withOwner(User $user): static
    {
        return $this->state(['owner_id' => $user->id]);
    }
}
