<?php

declare(strict_types=1);

namespace Database\Factories;

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
            'status' => 'active',
            'classification' => 'UNCLASSIFIED',
        ];
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
