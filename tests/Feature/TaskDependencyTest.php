<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Enums\Role;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('an editor can add a predecessor to a task', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create();

    $this->actingAs($editor)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertRedirect();

    expect($task->predecessors()->whereKey($predecessor->id)->exists())->toBeTrue();
});

test('a task cannot depend on itself', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $task->id,
    ])->assertInvalid('predecessor_id');

    expect($task->predecessors()->count())->toBe(0);
});

test('a duplicate dependency is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create();
    $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertInvalid('predecessor_id');

    expect($task->predecessors()->count())->toBe(1);
});

test('a predecessor from another project is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $other = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $foreign = Task::factory()->forProject($other)->create();

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $foreign->id,
    ])->assertInvalid('predecessor_id');
});

test('a circular dependency is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $a = Task::factory()->forProject($project)->create();
    $b = Task::factory()->forProject($project)->create();

    // A depends on B (B -> A). Now try B depends on A (A -> B) => cycle.
    $a->predecessors()->attach($b->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $b]), [
        'predecessor_id' => $a->id,
    ])->assertInvalid('predecessor_id');

    expect($b->predecessors()->count())->toBe(0);
});

test('a dependency between ancestor and descendant is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    $child = Task::factory()->forProject($project)->child($parent)->create();
    $grandchild = Task::factory()->forProject($project)->child($child)->create();

    // Either direction: a grandchild on its ancestor, or the ancestor on it.
    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $grandchild]), [
        'predecessor_id' => $parent->id,
    ])->assertInvalid('predecessor_id');

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $parent]), [
        'predecessor_id' => $grandchild->id,
    ])->assertInvalid('predecessor_id');

    expect($grandchild->predecessors()->count())->toBe(0)
        ->and($parent->predecessors()->count())->toBe(0);
});

test('a hierarchy-induced cycle is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create();
    $child = Task::factory()->forProject($project)->child($parent)->create();
    $outside = Task::factory()->forProject($project)->create();

    // outside depends on parent; making outside a predecessor of the child
    // would let a push of the child grow the parent's envelope and re-push
    // outside — a loop through the hierarchy.
    $outside->predecessors()->attach($parent->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $child]), [
        'predecessor_id' => $outside->id,
    ])->assertInvalid('predecessor_id');

    expect($child->predecessors()->count())->toBe(0);
});

test('adding a dependency pushes a violated movable successor into place', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-05',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $task = Task::factory()->forProject($project)->unlocked()->create([
        'start_date' => '2026-01-08',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertSessionHas('status', 'Dependency added — 1 task moved.');

    // The predecessor ends Jan 14; the successor slides to Jan 15.
    expect($task->refresh()->start_date->toDateString())->toBe('2026-01-15')
        ->and($task->predecessors()->count())->toBe(1);
});

test('adding a dependency that conflicts with a pinned successor previews then commits', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'start_date' => '2026-01-05',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $task = Task::factory()->forProject($project)->pinned()->create([
        'start_date' => '2026-01-08',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);

    // Without confirm: the preview is flashed and the edge is not created.
    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertSessionHas('schedulePreview', fn (array $preview): bool => $preview['intent'] === 'dependency'
        && $preview['conflicts'] !== []);

    expect($task->predecessors()->count())->toBe(0);

    // With confirm: the edge lands, the pinned task stays put (conflicted).
    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
        'confirm' => true,
    ])->assertSessionHas('status', 'Dependency added.');

    expect($task->predecessors()->count())->toBe(1)
        ->and($task->refresh()->start_date->toDateString())->toBe('2026-01-08');
});

test('an editor can remove a dependency', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create();
    $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $this->actingAs($editor)->delete(route('projects.tasks.dependencies.destroy', [$project, $task, $predecessor]))
        ->assertRedirect();

    expect($task->predecessors()->count())->toBe(0);
});

test('adding a dependency logs an activity action on the task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Fabrication']);

    $this->actingAs($owner)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertRedirect();

    $activity = $task->activitiesAsSubject()->where('event', 'dependency_added')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->causer_id)->toBe($owner->id)
        ->and($activity->properties['predecessor'] ?? null)->toBe('Fabrication');
});

test('removing a dependency logs an activity action on the task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Fabrication']);
    $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->delete(route('projects.tasks.dependencies.destroy', [$project, $task, $predecessor]))
        ->assertRedirect();

    $activity = $task->activitiesAsSubject()->where('event', 'dependency_removed')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['predecessor'] ?? null)->toBe('Fabrication');
});

test('the task show payload includes both predecessors and successors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Integration']);
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Fabrication']);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Acceptance']);

    // task depends on predecessor; successor depends on task.
    $task->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
    $successor->predecessors()->attach($task->id, ['type' => 'finish_to_start']);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('task.predecessors', 1)
            ->where('task.predecessors.0.name', 'Fabrication')
            ->has('task.successors', 1)
            ->where('task.successors.0.name', 'Acceptance')
        );
});

test('a viewer cannot add a dependency', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create();
    $predecessor = Task::factory()->forProject($project)->create();

    $this->actingAs($viewer)->post(route('projects.tasks.dependencies.store', [$project, $task]), [
        'predecessor_id' => $predecessor->id,
    ])->assertForbidden();
});
