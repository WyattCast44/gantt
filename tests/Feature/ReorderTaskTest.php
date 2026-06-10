<?php

declare(strict_types=1);

use App\Enums\ActivityAction;
use App\Enums\Role;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

test('an editor can reorder root tasks', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $a = Task::factory()->forProject($project)->create(['name' => 'A', 'sort_order' => 1]);
    $b = Task::factory()->forProject($project)->create(['name' => 'B', 'sort_order' => 2]);
    $c = Task::factory()->forProject($project)->create(['name' => 'C', 'sort_order' => 3]);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reorder', $project), [
            'parent_id' => null,
            'ordered_ids' => [$c->id, $a->id, $b->id],
        ])
        ->assertSessionHas('status', 'Tasks reordered.');

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())->toBe(['C', 'A', 'B']);
});

test('an editor can reorder a subtask group', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Parent']);
    $one = Task::factory()->forProject($project)->child($parent)->create(['name' => 'One', 'sort_order' => 1]);
    $two = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Two', 'sort_order' => 2]);

    $this->actingAs($editor)
        ->patch(route('projects.tasks.reorder', $project), [
            'parent_id' => $parent->id,
            'ordered_ids' => [$two->id, $one->id],
        ])
        ->assertSessionHas('status');

    expect($parent->children()->pluck('name')->all())->toBe(['Two', 'One']);
});

test('reordering records a Reordered audit action', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $a = Task::factory()->forProject($project)->create(['sort_order' => 1]);
    $b = Task::factory()->forProject($project)->create(['sort_order' => 2]);

    $this->actingAs($editor)->patch(route('projects.tasks.reorder', $project), [
        'parent_id' => null,
        'ordered_ids' => [$b->id, $a->id],
    ]);

    expect($project->activitiesAsSubject()->where('event', ActivityAction::Reordered->value)->exists())->toBeTrue();
});

test('a viewer cannot reorder tasks', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $a = Task::factory()->forProject($project)->create(['sort_order' => 1]);
    $b = Task::factory()->forProject($project)->create(['sort_order' => 2]);

    $this->actingAs($viewer)
        ->patch(route('projects.tasks.reorder', $project), [
            'parent_id' => null,
            'ordered_ids' => [$b->id, $a->id],
        ])
        ->assertForbidden();
});

test('the order must list exactly the sibling group', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $a = Task::factory()->forProject($project)->create(['sort_order' => 1]);
    $b = Task::factory()->forProject($project)->create(['sort_order' => 2]);
    $foreign = Task::factory()->create(); // different project

    // Missing a sibling.
    $this->actingAs($editor)
        ->patch(route('projects.tasks.reorder', $project), ['parent_id' => null, 'ordered_ids' => [$a->id]])
        ->assertSessionHasErrors('ordered_ids');

    // Includes a foreign task.
    $this->actingAs($editor)
        ->patch(route('projects.tasks.reorder', $project), ['parent_id' => null, 'ordered_ids' => [$a->id, $b->id, $foreign->id]])
        ->assertSessionHasErrors('ordered_ids');
});
