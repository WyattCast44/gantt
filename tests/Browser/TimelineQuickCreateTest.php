<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('pressing N opens a draft row and Enter creates the task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'n');
    $page->type('[data-testid=quick-create-input]', 'Engine checks');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('Engine checks')
        ->assertNoJavascriptErrors();

    $created = $project->tasks()->where('name', 'Engine checks')->sole();

    expect($created->parent_id)->toBeNull()
        ->and($created->start_date)->not->toBeNull();
});

test('Enter chains drafts so several tasks can be scaffolded in order', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'n');
    $page->type('[data-testid=quick-create-input]', 'First pass');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.4);
    $page->type('[data-testid=quick-create-input]', 'Second pass');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);
    $page->keys('[data-testid=gantt-scroll]', 'Escape');

    $page->assertSee('First pass')
        ->assertSee('Second pass')
        ->assertNoJavascriptErrors();

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())
        ->toBe(['Aircraft', 'First pass', 'Second pass']);
});

test('Shift+N creates a subtask of the selected row', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    // Select the row, then open a subtask draft beneath it.
    $page->keys('[data-testid=gantt-scroll]', 'ArrowDown');
    $page->keys('[data-testid=gantt-scroll]', 'Shift+N');
    $page->type('[data-testid=quick-create-input]', 'Avionics');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('Avionics')->assertNoJavascriptErrors();

    $created = $project->tasks()->where('name', 'Avionics')->sole();

    expect($created->parent_id)->toBe($parent->id)
        ->and($created->hierarchy_level)->toBe(2)
        ->and($created->start_date->toDateString())->toBe('2026-01-05');
});

test('Escape cancels the draft without creating anything', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'n');
    $page->type('[data-testid=quick-create-input]', 'Abandoned');
    $page->keys('[data-testid=quick-create-input]', 'Escape');
    $page->wait(0.3);

    $page->assertDontSee('Abandoned')->assertNoJavascriptErrors();

    expect($project->tasks()->count())->toBe(1);
});

test('F2 renames the selected task inline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'ArrowDown');
    $page->keys('[data-testid=gantt-scroll]', 'F2');
    $page->type('[data-testid=rename-input]', 'Rotorcraft');
    $page->keys('[data-testid=rename-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('Rotorcraft')->assertNoJavascriptErrors();

    expect($task->refresh()->name)->toBe('Rotorcraft');
});

test('Tab indents the draft into a subtask of the row above', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'n');
    $page->type('[data-testid=quick-create-input]', 'Avionics');
    $page->keys('[data-testid=quick-create-input]', 'Tab');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('Avionics')->assertNoJavascriptErrors();

    $created = $project->tasks()->where('name', 'Avionics')->sole();

    expect($created->parent_id)->toBe($parent->id)
        ->and($created->hierarchy_level)->toBe(2);
});

test('the Delete hotkey removes the selected task after confirmation', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $doomed = Task::factory()->forProject($project)->create(['name' => 'Obsolete', 'start_date' => '2026-01-10', 'sort_order' => 2]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Obsolete');

    $page->keys('[data-testid=gantt-scroll]', 'ArrowDown');
    $page->keys('[data-testid=gantt-scroll]', 'ArrowDown');
    $page->keys('[data-testid=gantt-scroll]', 'Delete');

    $page->assertSee('Delete task?');
    $page->click('Delete');
    $page->wait(0.6);

    $page->assertDontSee('Obsolete')
        ->assertSee('Aircraft')
        ->assertNoJavascriptErrors();

    expect(Task::withTrashed()->find($doomed->id)->trashed())->toBeTrue();
});

test('a viewer has no quick-create or rename affordances', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($viewer);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->keys('[data-testid=gantt-scroll]', 'n');
    $page->wait(0.2);

    $page->assertMissing('[data-testid=quick-create-input]');
    $page->assertNoJavascriptErrors();

    expect($project->tasks()->count())->toBe(1);
});
