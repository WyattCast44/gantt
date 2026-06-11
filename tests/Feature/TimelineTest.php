<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
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

test('an editor can reschedule a task by dragging, leaving its locks untouched', function () {
    Event::fake([TaskUpdated::class]);

    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->pinned()->create([
        'start_date' => '2026-01-01',
        'duration_days' => 5,
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
        ->and($task->lock_start)->toBeTrue()
        ->and($task->lock_duration)->toBeTrue();

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

test('rescheduling a predecessor pushes its violated movable successor', function () {
    Event::fake([TaskUpdated::class]);

    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-05',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $successor = Task::factory()->forProject($project)->unlocked()->create([
        'start_date' => '2026-01-20',
        'duration_days' => 3,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    // Drag the predecessor onto the successor: ends Jan 23, so the successor
    // (Jan 20) violates and slides to Jan 24, duration preserved.
    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $predecessor]), [
            'start_date' => '2026-01-19',
            'duration_days' => 5,
        ])
        ->assertSessionHas('status', 'Task rescheduled — 1 dependent task moved.');

    $successor->refresh();

    expect($successor->start_date->toDateString())->toBe('2026-01-24')
        ->and($successor->duration_days)->toBe(3);

    // The propagated move rides the bus and the audit trail.
    Event::assertDispatchedTimes(TaskUpdated::class, 2);

    $activity = $successor->activitiesAsSubject()->where('event', 'schedule_propagated')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['reason'] ?? null)->toBe('dependency_push')
        ->and($activity->properties['caused_by_task_id'] ?? null)->toBe($predecessor->id);
});

test('a cascade that would conflict with a pinned task is previewed, not committed', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'name' => 'Calibration',
        'start_date' => '2026-01-05',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned = Task::factory()->forProject($project)->pinned()->create([
        'name' => 'Demo day',
        'start_date' => '2026-01-20',
        'duration_days' => 3,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $response = $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $predecessor]), [
            'start_date' => '2026-01-19',
            'duration_days' => 5,
        ]);

    $response->assertSessionHas('schedulePreview', fn (array $preview): bool => $preview['intent'] === 'reschedule'
        && $preview['task_id'] === $predecessor->id
        && $preview['conflicts'][0]['successor_name'] === 'Demo day'
        && $preview['input']['start_date'] === '2026-01-19');

    // Nothing was committed — neither the drag nor any cascade.
    expect($predecessor->refresh()->start_date->toDateString())->toBe('2026-01-05')
        ->and($pinned->refresh()->start_date->toDateString())->toBe('2026-01-20');
});

test('a previewed conflict commits when resubmitted with confirm', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-05',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned = Task::factory()->forProject($project)->pinned()->create([
        'start_date' => '2026-01-20',
        'duration_days' => 3,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $predecessor]), [
            'start_date' => '2026-01-19',
            'duration_days' => 5,
            'confirm' => true,
        ])
        ->assertSessionHas('status', 'Task rescheduled.')
        ->assertSessionMissing('schedulePreview');

    // The drag committed; the pinned task never moved (the edge stays conflicted).
    expect($predecessor->refresh()->start_date->toDateString())->toBe('2026-01-19')
        ->and($pinned->refresh()->start_date->toDateString())->toBe('2026-01-20');
});

test('a parent task cannot be rescheduled by dragging', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->create(['start_date' => '2026-01-01', 'duration_days' => 5]);
    Task::factory()->forProject($project)->child($parent)->create(['start_date' => '2026-01-01']);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $parent]), [
            'start_date' => '2026-02-01',
            'duration_days' => 5,
        ])
        ->assertSessionHasErrors('start_date');
});

test('rescheduling requires a start date and duration', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create(['start_date' => '2026-01-01']);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reschedule', [$project, $task]), ['duration_days' => 0])
        ->assertSessionHasErrors(['start_date', 'duration_days']);
});
