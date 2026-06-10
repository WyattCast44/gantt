<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Events\TaskUpdated;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

test('a member can view the project timeline with the nested task tree', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);

    $this->actingAs($owner)->get(route('projects.timeline', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Timeline/Show', false)
            ->has('project')
            ->has('tasks', 1)
            ->where('tasks.0.name', 'Aircraft')
            ->has('tasks.0.children', 1)
            ->where('tasks.0.children.0.name', 'Sensor Integration')
        );
});

test('the timeline payload includes predecessors for dependency lines', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'sort_order' => 2]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->get(route('projects.timeline', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 2)
            ->where('tasks.1.name', 'Verify')
            ->has('tasks.1.predecessors', 1)
            ->where('tasks.1.predecessors.0.name', 'Calibrate')
        );
});

test('a non-member cannot view the project timeline', function () {
    $outsider = User::factory()->create();
    $project = Project::factory()->create();

    $this->actingAs($outsider)->get(route('projects.timeline', $project))
        ->assertForbidden();
});

test('an editor can reschedule a task by dragging, which unlocks it', function () {
    Event::fake([TaskUpdated::class]);

    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-01',
        'duration_days' => 5,
        'is_date_locked' => true,
    ]);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $task]), [
            'start_date' => '2026-01-08',
            'duration_days' => 10,
        ])
        ->assertSessionHas('status', 'Task rescheduled.');

    $task->refresh();

    expect($task->start_date->toDateString())->toBe('2026-01-08')
        ->and($task->duration_days)->toBe(10)
        ->and($task->is_date_locked)->toBeFalse();

    Event::assertDispatched(TaskUpdated::class);
});

test('a viewer cannot reschedule a task', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create(['start_date' => '2026-01-01', 'duration_days' => 5]);

    $this->actingAs($viewer)
        ->patch(route('projects.tasks.reschedule', [$project, $task]), [
            'start_date' => '2026-01-08',
            'duration_days' => 10,
        ])
        ->assertForbidden();

    expect($task->refresh()->start_date->toDateString())->toBe('2026-01-01');
});

test('rescheduling requires a start date and duration', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create(['start_date' => '2026-01-01']);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $task]), ['duration_days' => 0])
        ->assertSessionHasErrors(['start_date', 'duration_days']);
});
