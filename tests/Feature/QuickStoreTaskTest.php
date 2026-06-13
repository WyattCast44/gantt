<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
use App\Enums\Role;
use App\Enums\TaskStatus;
use App\Events\TaskCreated;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('an editor can quick-create a root task by name alone', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)
        ->from(route('projects.timeline', $project))
        ->post(route('projects.tasks.quick-store', $project), ['name' => 'Dry run'])
        ->assertRedirect(route('projects.timeline', $project))
        ->assertSessionHas('status', 'Task created.');

    $task = $project->tasks()->sole();

    expect($task->name)->toBe('Dry run')
        ->and($task->parent_id)->toBeNull()
        ->and($task->hierarchy_level)->toBe(1)
        ->and($task->start_date->toDateString())->toBe(today()->toDateString())
        ->and($task->duration_days)->toBe(1)
        ->and($task->duration_unit)->toBe(DurationUnit::WorkDays)
        ->and($task->status)->toBe(TaskStatus::NotStarted)
        ->and($task->percent_complete)->toBe(0)
        ->and($task->lock_start)->toBeFalse()
        ->and($task->lock_end)->toBeFalse()
        ->and($task->lock_duration)->toBeTrue()
        ->and($task->base_classification)->toBe(BaseClassification::UNCLASSIFIED);
});

test('quick-create dispatches the TaskCreated event', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    Event::fake([TaskCreated::class]);

    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), ['name' => 'Eventful']);

    Event::assertDispatched(TaskCreated::class);
});

test('the start date anchors to the insert-after sibling', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $sibling = Task::factory()->forProject($project)->create([
        'start_date' => '2027-03-15',
        'sort_order' => 1,
    ]);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'Anchored',
        'after_id' => $sibling->id,
    ]);

    $task = $project->tasks()->where('name', 'Anchored')->sole();

    expect($task->start_date->toDateString())->toBe('2027-03-15');
});

test('the start date anchors to the parent when there is no sibling reference', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->create(['start_date' => '2027-06-01']);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'Nested',
        'parent_id' => $parent->id,
    ]);

    $task = $project->tasks()->where('name', 'Nested')->sole();

    expect($task->start_date->toDateString())->toBe('2027-06-01')
        ->and($task->parent_id)->toBe($parent->id)
        ->and($task->hierarchy_level)->toBe(2);
});

test('the start date falls back to today when the context has no dates', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->create(['start_date' => null]);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'Today task',
        'parent_id' => $parent->id,
    ]);

    $task = $project->tasks()->where('name', 'Today task')->sole();

    expect($task->start_date->toDateString())->toBe(today()->toDateString());
});

test('quick-create inserts directly after the reference sibling', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $a = Task::factory()->forProject($project)->create(['name' => 'A', 'sort_order' => 1]);
    Task::factory()->forProject($project)->create(['name' => 'B', 'sort_order' => 2]);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'A2',
        'after_id' => $a->id,
    ]);

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())->toBe(['A', 'A2', 'B']);
});

test('quick-create appends to the end of the sibling group without a reference', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    Task::factory()->forProject($project)->create(['name' => 'First', 'sort_order' => 1]);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'Last',
    ]);

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())->toBe(['First', 'Last']);
});

test('creating a subtask reshapes the parent envelope', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->unlocked()->create([
        'start_date' => '2027-06-01',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    $this->actingAs($editor)->post(route('projects.tasks.quick-store', $project), [
        'name' => 'Only child',
        'parent_id' => $parent->id,
    ]);

    $child = $project->tasks()->where('name', 'Only child')->sole();
    $parent->refresh();

    // The parent is now an engine-derived envelope of its single child.
    expect($parent->start_date->toDateString())->toBe($child->start_date->toDateString())
        ->and($parent->endDate()?->toDateString())->toBe($child->endDate()?->toDateString());
});

test('the depth cap is enforced', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $parent = Task::factory()->forProject($project)->create();

    foreach (range(2, Task::MAX_DEPTH) as $level) {
        $parent = Task::factory()->forProject($project)->child($parent)->create();
    }

    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), [
            'name' => 'Too deep',
            'parent_id' => $parent->id,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('the parent must belong to the project', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $foreignParent = Task::factory()->create();

    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), [
            'name' => 'Stray',
            'parent_id' => $foreignParent->id,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('the insert-after reference must be a sibling at the requested position', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->create();
    $nephew = Task::factory()->forProject($project)->child($parent)->create();

    // A child of another task is not a sibling of the root group.
    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), [
            'name' => 'Misplaced',
            'after_id' => $nephew->id,
        ])
        ->assertSessionHasErrors('after_id');

    // A task from another project is never a valid reference.
    $foreign = Task::factory()->create();

    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), [
            'name' => 'Misplaced',
            'after_id' => $foreign->id,
        ])
        ->assertSessionHasErrors('after_id');
});

test('a name is required', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)
        ->post(route('projects.tasks.quick-store', $project), ['name' => ''])
        ->assertSessionHasErrors('name');
});

test('a viewer cannot quick-create tasks', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();

    $this->actingAs($viewer)
        ->post(route('projects.tasks.quick-store', $project), ['name' => 'Nope'])
        ->assertForbidden();
});
