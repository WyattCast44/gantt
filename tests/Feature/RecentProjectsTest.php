<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Create projects owned by the user with controlled, ascending updated_at so
 * the last element is the most recently updated.
 *
 * @return array<int, Project>
 */
function projectsByRecency(User $user, int $count): array
{
    $projects = [];

    for ($i = 0; $i < $count; $i++) {
        $project = Project::factory()->withOwner($user)->create();
        $project->updated_at = now()->subDays($count - $i);
        $project->saveQuietly();
        $projects[] = $project;
    }

    return $projects;
}

test('the switcher shares only the latest 3 projects by updated_at', function () {
    $user = User::factory()->create();
    $projects = projectsByRecency($user, 5);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('recentProjects', 3)
            ->where('recentProjects.0.id', $projects[4]->id)
            ->where('recentProjects.1.id', $projects[3]->id)
            ->where('recentProjects.2.id', $projects[2]->id)
        );
});

test('the current project is always included even when not recently updated', function () {
    $user = User::factory()->create();
    $projects = projectsByRecency($user, 5);
    $oldest = $projects[0];

    $this->actingAs($user)->get(route('projects.show', $oldest))
        ->assertInertia(fn (Assert $page) => $page
            ->has('recentProjects', 3)
            ->where('recentProjects.0.id', $oldest->id)
        );
});

test('fewer than the limit returns all accessible projects', function () {
    $user = User::factory()->create();
    Project::factory()->withOwner($user)->create();

    $this->actingAs($user)->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('recentProjects', 1));
});
