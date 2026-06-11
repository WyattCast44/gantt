<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
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
            'duration_unit' => DurationUnit::WorkDays,
            'lock_start' => false,
            'lock_end' => false,
            'lock_duration' => true,
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
     * Fully pin the task's schedule (start + duration locked) so the rules
     * engine may never move it.
     */
    public function pinned(): static
    {
        return $this->state([
            'lock_start' => true,
            'lock_end' => false,
            'lock_duration' => true,
        ]);
    }

    /**
     * Leave the task free to slide (duration preserved, no date locks).
     */
    public function unlocked(): static
    {
        return $this->state([
            'lock_start' => false,
            'lock_end' => false,
            'lock_duration' => true,
        ]);
    }

    /**
     * Lock only the start date.
     */
    public function startLocked(): static
    {
        return $this->state([
            'lock_start' => true,
            'lock_end' => false,
            'lock_duration' => false,
        ]);
    }

    /**
     * Lock only the end date (a deadline the engine may compress against).
     */
    public function endLocked(): static
    {
        return $this->state([
            'lock_start' => false,
            'lock_end' => true,
            'lock_duration' => false,
        ]);
    }
}
