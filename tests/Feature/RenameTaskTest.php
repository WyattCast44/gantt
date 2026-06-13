<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Events\TaskUpdated;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('an editor can rename a task inline', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Old name']);

    $this->actingAs($editor)
        ->from(route('projects.timeline', $project))
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => 'New name'])
        ->assertRedirect(route('projects.timeline', $project))
        ->assertSessionHas('status', 'Task renamed.');

    expect($task->refresh()->name)->toBe('New name');
});

test('renaming dispatches the TaskUpdated event', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();

    Event::fake([TaskUpdated::class]);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => 'Renamed']);

    Event::assertDispatched(TaskUpdated::class);
});

test('renaming never touches the schedule', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create([
        'start_date' => '2027-03-15',
        'duration_days' => 7,
    ]);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => 'Renamed']);

    $task->refresh();

    expect($task->start_date->toDateString())->toBe('2027-03-15')
        ->and($task->duration_days)->toBe(7);
});

test('a name is required and length-capped', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($editor)
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => ''])
        ->assertSessionHasErrors('name');

    $this->actingAs($editor)
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => str_repeat('x', 256)])
        ->assertSessionHasErrors('name');
});

test('a viewer cannot rename tasks', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Untouchable']);

    $this->actingAs($viewer)
        ->patch(route('projects.tasks.rename', [$project, $task]), ['name' => 'Touched'])
        ->assertForbidden();

    expect($task->refresh()->name)->toBe('Untouchable');
});

test('a task from another project cannot be renamed through this project', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $foreignTask = Task::factory()->create();

    $this->actingAs($editor)
        ->patch(route('projects.tasks.rename', [$project, $foreignTask]), ['name' => 'Hijacked'])
        ->assertNotFound();
});
