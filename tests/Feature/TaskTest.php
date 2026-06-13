<?php

declare(strict_types=1);

use App\Enums\ActivityAction;
use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
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
        'duration_unit' => DurationUnit::WorkDays->value,
        'lock_start' => true,
        'lock_duration' => true,
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
        ->assertRedirect(route('projects.tasks.show', [$project, $project->tasks()->first()]));

    $task = $project->tasks()->firstOrFail();

    expect($task->name)->toBe('EO Calibration')
        ->and($task->hierarchy_level)->toBe(1)
        ->and($task->parent_id)->toBeNull()
        ->and($task->lock_start)->toBeTrue()
        ->and($task->lock_duration)->toBeTrue()
        ->and($task->lock_end)->toBeFalse()
        ->and($task->created_by)->toBe($editor->id);
});

test('locking all three schedule fields is rejected', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->post(route('projects.tasks.store', $project), taskPayload([
        'lock_start' => true,
        'lock_end' => true,
        'lock_duration' => true,
    ]))->assertSessionHasErrors('lock_start');

    expect($project->tasks()->count())->toBe(0);
});

test('the model refuses to save more than two schedule locks', function () {
    $task = Task::factory()->create();

    $task->lock_start = true;
    $task->lock_end = true;
    $task->lock_duration = true;

    expect(fn () => $task->save())->toThrow(LogicException::class);
});

test('creating a child rolls the parent envelope up to cover it', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create([
        'start_date' => '2026-03-02',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    // First child: Mar 4 + 3cd (ends Mar 6). The parent stops being its own
    // schedule and becomes the envelope of its subtree.
    $this->actingAs($owner)->post(route('projects.tasks.store', $project), taskPayload([
        'parent_id' => $parent->id,
        'name' => 'Child A',
        'start_date' => '2026-03-04',
        'duration_days' => 3,
        'duration_unit' => DurationUnit::CalendarDays->value,
    ]))->assertRedirect();

    $parent->refresh();

    expect($parent->start_date->toDateString())->toBe('2026-03-04')
        ->and($parent->endDate()->toDateString())->toBe('2026-03-06');

    // A propagated roll-up is recorded in the parent's audit trail.
    $activity = $parent->activitiesAsSubject()->where('event', 'schedule_propagated')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['reason'] ?? null)->toBe('rollup')
        ->and($activity->properties['caused_by_task'] ?? null)->toBe('Child A');
});

test('deleting a child shrinks the parent envelope', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    $early = Task::factory()->forProject($project)->child($parent)->create([
        'start_date' => '2026-03-02',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    Task::factory()->forProject($project)->child($parent)->create([
        'start_date' => '2026-03-10',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    // Normalize the parent to the two-child envelope first.
    $project->commitSchedule($project->previewSchedule(), $parent);

    $this->actingAs($owner)->delete(route('projects.tasks.destroy', [$project, $early]))
        ->assertRedirect();

    $parent->refresh();

    expect($parent->start_date->toDateString())->toBe('2026-03-10')
        ->and($parent->endDate()->toDateString())->toBe('2026-03-11');
});

test('a parent task schedule cannot be edited directly', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create([
        'start_date' => '2026-03-02',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::WorkDays,
        'lock_start' => false,
        'lock_end' => false,
        'lock_duration' => true,
    ]);
    Task::factory()->forProject($project)->child($parent)->create([
        'start_date' => '2026-03-02',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::WorkDays,
    ]);

    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $parent]), taskPayload([
        'name' => $parent->name,
        'start_date' => '2026-04-01',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::WorkDays->value,
        'lock_start' => false,
        'lock_end' => false,
        'lock_duration' => true,
    ]))->assertSessionHasErrors('start_date');

    // Resubmitting the unchanged schedule (e.g. a rename) is still allowed.
    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $parent]), taskPayload([
        'name' => 'Renamed group',
        'start_date' => '2026-03-02',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::WorkDays->value,
        'lock_start' => false,
        'lock_end' => false,
        'lock_duration' => true,
    ]))->assertSessionDoesntHaveErrors();

    expect($parent->refresh()->name)->toBe('Renamed group');
});

test('updating a task through the form pushes its violated successors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-05',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $successor = Task::factory()->forProject($project)->unlocked()->create([
        'start_date' => '2026-01-12',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $successor->predecessors()->attach($task->id, ['type' => 'finish_to_start']);

    // Extending the duration to 10 days makes the task end Jan 14, so the
    // successor (Jan 12) slides to Jan 15.
    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $task]), taskPayload([
        'start_date' => '2026-01-05',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays->value,
    ]))->assertSessionHas('status', 'Task updated — 1 dependent task moved.');

    expect($successor->refresh()->start_date->toDateString())->toBe('2026-01-15');
});

test('creating a task without a start date defaults to today', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->post(route('projects.tasks.store', $project), taskPayload([
        'start_date' => null,
    ]))->assertRedirect();

    expect($project->tasks()->firstOrFail()->start_date?->toDateString())->toBe(today()->toDateString());
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

test('an editor can view the task create form', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->get(route('projects.tasks.create', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Create', false)
            ->has('project')
            ->has('parents')
            ->where('defaultParentId', null)
        );
});

test('the create form preselects a valid parent from the query string', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)->get(route('projects.tasks.create', [
        'project' => $project,
        'parent_id' => $parent->id,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Create', false)
            ->where('defaultParentId', $parent->id)
        );
});

test('a viewer cannot view the task create form', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();

    $this->actingAs($viewer)->get(route('projects.tasks.create', $project))
        ->assertForbidden();
});

test('the show page renders the edit tab', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($editor)->get(route('projects.tasks.show', [$project, $task, 'tab' => 'edit']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Show', false)
            ->where('task.id', $task->id)
        );
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

test('creating a task records a TaskCreated entry in the project history', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->post(route('projects.tasks.store', $project), taskPayload(['name' => 'EO Calibration']));

    $activity = $project->activitiesAsSubject()->where('event', ActivityAction::TaskCreated->value)->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['task'])->toBe('EO Calibration')
        ->and($activity->causer_id)->toBe($editor->id);
});

test('quick-creating a task records a TaskCreated entry in the project history', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), ['name' => 'Scaffolded']);

    $activity = $project->activitiesAsSubject()->where('event', ActivityAction::TaskCreated->value)->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['task'])->toBe('Scaffolded');
});

test('deleting a task records a TaskDeleted entry in the project history', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Retired task']);

    $this->actingAs($owner)->delete(route('projects.tasks.destroy', [$project, $task]));

    $activity = $project->activitiesAsSubject()->where('event', ActivityAction::TaskDeleted->value)->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['task'])->toBe('Retired task')
        ->and($activity->causer_id)->toBe($owner->id);
});

test('deleting from the timeline redirects back to the timeline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)
        ->from(route('projects.timeline', $project))
        ->delete(route('projects.tasks.destroy', [$project, $task]), ['from' => 'timeline'])
        ->assertRedirect(route('projects.timeline', $project))
        ->assertSessionHas('status', 'Task deleted.');

    expect(Task::withTrashed()->find($task->id)->trashed())->toBeTrue();
});

test('the derived end date is start plus duration at calendar-day grain', function () {
    $task = Task::factory()->create([
        'start_date' => '2026-03-01',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-05');
});

test('the derived end date counts work days on the project calendar', function () {
    $task = Task::factory()->create([
        'start_date' => '2026-03-02',
        'duration_days' => 5,
        'duration_unit' => DurationUnit::WorkDays,
    ]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-06');
});

test('a one-day calendar task ends on its start date', function () {
    $task = Task::factory()->create([
        'start_date' => '2026-03-01',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-01');
});

test('a one-day work task starting on a weekend ends on the next work day', function () {
    $task = Task::factory()->create([
        'start_date' => '2026-03-01',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::WorkDays,
    ]);

    expect($task->endDate()?->toDateString())->toBe('2026-03-02');
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
            ->where('task.has_incomplete_descendants', true)
        );
});

test('the show payload reports no incomplete descendants when the subtree is complete', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['status' => TaskStatus::Complete]);
    Task::factory()->forProject($project)->child($parent)->create([
        'name' => 'Calibrate sensor',
        'status' => TaskStatus::Complete,
    ]);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $parent]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('task.has_incomplete_descendants', false)
        );
});

test('the show payload includes the parent task when present', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $child]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('task.parent_id', $parent->id)
            ->where('task.parent.id', $parent->id)
            ->where('task.parent.name', 'Aircraft')
        );
});

test('the show payload includes the derived end date and metadata', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-01',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Tasks/Show', false)
            ->where('task.end_date', '2026-01-10')
            ->where('task.duration_days', 10)
            ->where('task.duration_unit.value', 'calendar_days')
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

    // The parent's status is derived from its (still not-started) child.
    expect($parent->fresh()->status)->toBe(TaskStatus::NotStarted);
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

test('a parent rolls up the average percent complete of its children', function () {
    $project = Project::factory()->create();
    $parent = Task::factory()->forProject($project)->create();
    $a = Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);
    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);

    $a->update(['percent_complete' => 100, 'status' => TaskStatus::Complete]);

    expect($parent->fresh())
        ->percent_complete->toBe(50)
        ->status->toBe(TaskStatus::InProgress);
});

test('a parent is complete only when every child is, and never rounds up to 100', function () {
    $project = Project::factory()->create();
    $parent = Task::factory()->forProject($project)->create();
    $a = Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 99, 'status' => TaskStatus::InProgress]);
    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 100, 'status' => TaskStatus::Complete]);

    // avg(99, 100) = 99.5 → would round to 100, but a still-open parent is clamped to 99.
    expect($parent->fresh())
        ->percent_complete->toBe(99)
        ->status->toBe(TaskStatus::InProgress);

    $a->update(['percent_complete' => 100, 'status' => TaskStatus::Complete]);

    expect($parent->fresh())
        ->percent_complete->toBe(100)
        ->status->toBe(TaskStatus::Complete);
});

test('a leaf change rolls up through every ancestor to the root', function () {
    $project = Project::factory()->create();
    $root = Task::factory()->forProject($project)->create();
    $mid = Task::factory()->forProject($project)->child($root)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);
    $leaf = Task::factory()->forProject($project)->child($mid)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);

    $leaf->update(['percent_complete' => 100, 'status' => TaskStatus::Complete]);

    expect($mid->fresh()->status)->toBe(TaskStatus::Complete)
        ->and($root->fresh()->status)->toBe(TaskStatus::Complete)
        ->and($root->fresh()->percent_complete)->toBe(100);
});

test('adding a fresh child drops a previously complete parent', function () {
    $project = Project::factory()->create();
    $parent = Task::factory()->forProject($project)->create();
    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 100, 'status' => TaskStatus::Complete]);

    expect($parent->fresh()->status)->toBe(TaskStatus::Complete);

    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);

    expect($parent->fresh())
        ->percent_complete->toBe(50)
        ->status->toBe(TaskStatus::InProgress);
});

test('deleting the last incomplete child lifts the parent to complete', function () {
    $project = Project::factory()->create();
    $parent = Task::factory()->forProject($project)->create();
    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 100, 'status' => TaskStatus::Complete]);
    $straggler = Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 0, 'status' => TaskStatus::NotStarted]);

    expect($parent->fresh()->status)->toBe(TaskStatus::InProgress);

    $straggler->delete();

    expect($parent->fresh()->status)->toBe(TaskStatus::Complete);
});

test('the update endpoint rejects a manual progress change on a parent but accepts the derived values', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    Task::factory()->forProject($project)->child($parent)->create(['percent_complete' => 40, 'status' => TaskStatus::InProgress]);
    $parent->refresh();

    // Resubmit the parent's own (derived) schedule so only progress is in play.
    $schedule = [
        'start_date' => $parent->start_date?->toDateString(),
        'duration_days' => $parent->duration_days,
        'duration_unit' => $parent->duration_unit->value,
        'lock_start' => $parent->lock_start,
        'lock_end' => $parent->lock_end,
        'lock_duration' => $parent->lock_duration,
    ];

    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $parent]), taskPayload([
        ...$schedule,
        'status' => TaskStatus::Complete->value,
        'percent_complete' => 80,
    ]))->assertInvalid('percent_complete');

    $this->actingAs($owner)->patch(route('projects.tasks.update', [$project, $parent]), taskPayload([
        ...$schedule,
        'name' => 'Renamed parent',
        'status' => $parent->status->value,
        'percent_complete' => $parent->percent_complete,
    ]))->assertValid();

    expect($parent->fresh()->name)->toBe('Renamed parent');
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
