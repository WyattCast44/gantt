<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a member can view a single task scoped to its subtree on the timeline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Wiring']);
    Task::factory()->forProject($project)->create(['name' => 'Unrelated root']);

    $this->actingAs($owner)->get(route('projects.tasks.timeline', [$project, $child]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Timeline/Show', false)
            ->has('project')
            // Only the scoped task is a root; its sibling and the unrelated root are absent.
            ->has('tasks', 1)
            ->where('tasks.0.name', 'Sensor Integration')
            ->where('scopeTask.id', $child->id)
            ->where('scopeTask.name', 'Sensor Integration')
        );
});

test('the scoped timeline nests descendants under the root task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    Task::factory()->forProject($project)->child($child)->create(['name' => 'Calibrate']);

    $this->actingAs($owner)->get(route('projects.tasks.timeline', [$project, $parent]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 1)
            ->where('tasks.0.name', 'Aircraft')
            ->has('tasks.0.children', 1)
            ->where('tasks.0.children.0.name', 'Sensor Integration')
            ->has('tasks.0.children.0.children', 1)
            ->where('tasks.0.children.0.children.0.name', 'Calibrate')
        );
});

test('the scoped timeline carries the ancestor chain for the breadcrumb', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    $grandchild = Task::factory()->forProject($project)->child($child)->create(['name' => 'Calibrate']);

    $this->actingAs($owner)->get(route('projects.tasks.timeline', [$project, $grandchild]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('ancestors', 2)
            ->where('ancestors.0.name', 'Aircraft')
            ->where('ancestors.1.name', 'Sensor Integration')
        );
});

test('a root task has no ancestors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);

    $this->actingAs($owner)->get(route('projects.tasks.timeline', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('ancestors', 0));
});

test('a non-member cannot view the scoped task timeline', function () {
    $outsider = User::factory()->create();
    $project = Project::factory()->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($outsider)->get(route('projects.tasks.timeline', [$project, $task]))
        ->assertForbidden();
});

test('a task from another project is not bound to the timeline route', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $otherProject = Project::factory()->withOwner($owner)->create();
    $foreignTask = Task::factory()->forProject($otherProject)->create();

    $this->actingAs($owner)->get(route('projects.tasks.timeline', [$project, $foreignTask]))
        ->assertNotFound();
});
