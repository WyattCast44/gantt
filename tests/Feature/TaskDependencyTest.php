<?php

declare(strict_types=1);

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
