<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\RiskLevel;
use App\Enums\Role;
use App\Enums\TaskStatus;
use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\RecordDomainEventTelemetry;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * The minimum valid task payload.
 *
 * @return array<string, mixed>
 */
function taskPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'EO Calibration',
        'description' => 'Calibrate the electro-optical sensor.',
        'start_date' => '2026-01-01',
        'duration_days' => 5,
        'is_date_locked' => true,
        'status' => TaskStatus::NotStarted->value,
        'percent_complete' => 0,
        'risk_level' => RiskLevel::Low->value,
        'organization' => 'Test Squadron',
        'tags' => ['sensor'],
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ], $overrides);
}

test('an editor can create a top-level task', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->post(route('projects.tasks.store', $project), taskPayload())
        ->assertRedirect();

    $task = $project->tasks()->firstOrFail();

    expect($task->name)->toBe('EO Calibration')
        ->and($task->hierarchy_level)->toBe(1)
        ->and($task->parent_id)->toBeNull()
        ->and($task->is_date_locked)->toBeTrue()
        ->and($task->created_by)->toBe($editor->id);
});

test('a child task inherits its hierarchy level from the parent', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)->post(route('projects.tasks.store', $project), taskPayload([
        'parent_id' => $parent->id,
        'name' => 'SAR Verification',
    ]))->assertRedirect();

    $child = $project->tasks()->where('name', 'SAR Verification')->firstOrFail();

    expect($child->parent_id)->toBe($parent->id)
        ->and($child->hierarchy_level)->toBe(2);
});

test('tasks cannot be nested beyond five levels', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $deep = Task::factory()->forProject($project)->create(['hierarchy_level' => 5]);

    $this->actingAs($owner)->post(route('projects.tasks.store', $project), taskPayload([
        'parent_id' => $deep->id,
    ]))->assertInvalid('parent_id');

    expect($project->tasks()->count())->toBe(1);
});

test('a task cannot be classified above the project baseline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->classifiedAs(BaseClassification::CONFIDENTIAL)->create();

    $this->actingAs($owner)->post(route('projects.tasks.store', $project), taskPayload([
        'base_classification' => BaseClassification::SECRET->value,
    ]))->assertInvalid('base_classification');

    expect($project->tasks()->count())->toBe(0);
});

test('a viewer cannot create a task', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();

    $this->actingAs($viewer)->post(route('projects.tasks.store', $project), taskPayload())
        ->assertForbidden();

    expect($project->tasks()->count())->toBe(0);
});

test('a non-member cannot create a task', function () {
    $project = Project::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->post(route('projects.tasks.store', $project), taskPayload())
        ->assertForbidden();
});

test('an editor can update a task', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($editor)->patch(route('projects.tasks.update', [$project, $task]), taskPayload([
        'name' => 'Renamed',
        'status' => TaskStatus::InProgress->value,
        'percent_complete' => 40,
    ]))->assertRedirect();

    expect($task->fresh())
        ->name->toBe('Renamed')
        ->status->toBe(TaskStatus::InProgress)
        ->percent_complete->toBe(40);
});

test('deleting a task soft-deletes its whole subtree', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    $child = Task::factory()->forProject($project)->child($parent)->create();
    $grandchild = Task::factory()->forProject($project)->child($child)->create();

    $this->actingAs($owner)->delete(route('projects.tasks.destroy', [$project, $parent]))
        ->assertRedirect(route('projects.tasks.index', $project));

    expect(Task::withTrashed()->find($parent->id)->trashed())->toBeTrue()
        ->and(Task::withTrashed()->find($child->id)->trashed())->toBeTrue()
        ->and(Task::withTrashed()->find($grandchild->id)->trashed())->toBeTrue();
});

test('the derived end date is start plus duration at day grain', function () {
    $task = Task::factory()->create(['start_date' => '2026-03-01', 'duration_days' => 5]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-05');
});

test('a one-day task ends on its start date', function () {
    $task = Task::factory()->create(['start_date' => '2026-03-01', 'duration_days' => 1]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-01');
});

test('the index renders the project task tree', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);

    $this->actingAs($owner)->get(route('projects.tasks.index', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Index', false)
            ->has('tasks', 1)
            ->where('tasks.0.name', 'Aircraft')
            ->has('tasks.0.children', 1)
            ->where('tasks.0.children.0.name', 'Sensor Integration')
        );
});

test('the show payload includes direct child tasks', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Calibrate sensor']);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $parent]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('task.children', 1)
            ->where('task.children.0.name', 'Calibrate sensor')
        );
});

test('the show payload includes the derived end date and metadata', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-01',
        'duration_days' => 10,
    ]);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Show', false)
            ->where('task.end_date', '2026-01-10')
            ->where('task.duration_days', 10)
            ->has('availableTasks')
        );
});

test('creating a task dispatches TaskCreated', function () {
    Event::fake([TaskCreated::class, TaskUpdated::class]);

    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    $this->actingAs($owner)->post(route('projects.tasks.store', $project), taskPayload());

    Event::assertDispatched(TaskCreated::class);
});

test('updating a task dispatches TaskUpdated', function () {
    Event::fake([TaskCreated::class, TaskUpdated::class]);

    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $task]), taskPayload());

    Event::assertDispatched(TaskUpdated::class);
});

test('the telemetry listener handles task events without error', function () {
    $task = Task::factory()->create();

    $listener = new RecordDomainEventTelemetry;

    $listener->handle(new TaskCreated($task));
    $listener->handle(new TaskUpdated($task));

    expect(true)->toBeTrue();
});

test('an editor can mark a leaf task complete', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create([
        'status' => TaskStatus::InProgress,
        'percent_complete' => 40,
    ]);

    $this->actingAs($editor)->post(route('projects.tasks.complete', [$project, $task]))
        ->assertRedirect();

    expect($task->fresh())
        ->status->toBe(TaskStatus::Complete)
        ->percent_complete->toBe(100);
});

test('an editor can mark a parent complete when all subtasks are already complete', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['status' => TaskStatus::InProgress]);
    Task::factory()->forProject($project)->child($parent)->create(['status' => TaskStatus::Complete, 'percent_complete' => 100]);

    $this->actingAs($owner)->post(route('projects.tasks.complete', [$project, $parent]))
        ->assertRedirect();

    expect($parent->fresh()->status)->toBe(TaskStatus::Complete);
});

test('marking a parent complete requires including incomplete subtasks', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['status' => TaskStatus::InProgress]);
    Task::factory()->forProject($project)->child($parent)->create(['status' => TaskStatus::NotStarted]);

    $this->actingAs($owner)->post(route('projects.tasks.complete', [$project, $parent]))
        ->assertInvalid('include_subtasks');

    expect($parent->fresh()->status)->toBe(TaskStatus::InProgress);
});

test('an editor can mark a parent and its subtree complete', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['status' => TaskStatus::InProgress]);
    $child = Task::factory()->forProject($project)->child($parent)->create(['status' => TaskStatus::NotStarted]);
    $grandchild = Task::factory()->forProject($project)->child($child)->create(['status' => TaskStatus::InProgress, 'percent_complete' => 50]);

    $this->actingAs($owner)->post(route('projects.tasks.complete', [$project, $parent]), [
        'include_subtasks' => true,
    ])->assertRedirect();

    expect($parent->fresh()->status)->toBe(TaskStatus::Complete)
        ->and($child->fresh()->status)->toBe(TaskStatus::Complete)
        ->and($grandchild->fresh()->status)->toBe(TaskStatus::Complete)
        ->and($grandchild->fresh()->percent_complete)->toBe(100);
});

test('a viewer cannot mark a task complete', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create(['status' => TaskStatus::InProgress]);

    $this->actingAs($viewer)->post(route('projects.tasks.complete', [$project, $task]))
        ->assertForbidden();

    expect($task->fresh()->status)->toBe(TaskStatus::InProgress);
});

test('marking a task complete dispatches TaskUpdated', function () {
    Event::fake([TaskUpdated::class]);

    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['status' => TaskStatus::InProgress]);

    $this->actingAs($owner)->post(route('projects.tasks.complete', [$project, $task]));

    Event::assertDispatched(TaskUpdated::class);
});
