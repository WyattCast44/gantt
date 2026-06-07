<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BaseClassification;
use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
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
            'parent_id' => null,
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
            'start_date' => fake()->optional()->dateTimeBetween('-1 month', '+1 month'),
            'duration_days' => fake()->numberBetween(1, 30),
            'is_date_locked' => true,
            'hierarchy_level' => 1,
            'sort_order' => 0,
            'status' => TaskStatus::NotStarted,
            'percent_complete' => 0,
            'risk_level' => RiskLevel::Low,
            'organization' => fake()->optional()->company(),
            'tags' => null,
            'base_classification' => BaseClassification::UNCLASSIFIED,
            'special_access_required' => false,
            'handling_caveats' => null,
            'programs' => null,
        ];
    }

    /**
     * Attach the task to a specific project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(['project_id' => $project->id]);
    }

    /**
     * Make the task a top-level (root) task.
     */
    public function root(): static
    {
        return $this->state([
            'parent_id' => null,
            'hierarchy_level' => 1,
        ]);
    }

    /**
     * Nest the task under a given parent, inheriting its project and depth.
     */
    public function child(Task $parent): static
    {
        return $this->state([
            'project_id' => $parent->project_id,
            'parent_id' => $parent->id,
            'hierarchy_level' => $parent->hierarchy_level + 1,
        ]);
    }

    /**
     * Set the task's classification marking.
     */
    public function classifiedAs(BaseClassification $level): static
    {
        return $this->state(['base_classification' => $level]);
    }

    /**
     * Pin the task's dates (the V1 default).
     */
    public function locked(): static
    {
        return $this->state(['is_date_locked' => true]);
    }

    /**
     * Leave the task's dates unlocked.
     */
    public function unlocked(): static
    {
        return $this->state(['is_date_locked' => false]);
    }
}
