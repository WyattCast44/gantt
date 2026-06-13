<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the toolbar New task button opens a draft and creates a task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->click('[data-testid=toolbar-new-task]');
    $page->type('[data-testid=quick-create-input]', 'From toolbar');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('From toolbar')->assertNoJavascriptErrors();

    expect($project->tasks()->where('name', 'From toolbar')->exists())->toBeTrue();
});

test('the shortcuts menu documents the quick-create hotkeys', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->click('[aria-label="Keyboard shortcuts"]');

    $page->assertSee('New task below the selection')
        ->assertSee('New subtask of the selection')
        ->assertSee('Rename the selection')
        ->assertSee('Go to today')
        ->assertNoJavascriptErrors();
});

test('a viewer sees navigation shortcuts but no create buttons', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($viewer);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->assertMissing('[data-testid=toolbar-new-task]');

    $page->click('[aria-label="Keyboard shortcuts"]');
    $page->assertSee('Go to today');
    $page->assertDontSee('New task below the selection');
    $page->assertNoJavascriptErrors();
});

test('an empty project can scaffold its first task from the timeline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");

    $page->assertSee('No tasks yet');

    $page->click('[data-testid=toolbar-new-task]');
    $page->type('[data-testid=quick-create-input]', 'First ever');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);
    $page->keys('[data-testid=gantt-scroll]', 'Escape');

    $page->assertSee('First ever')
        ->assertDontSee('No tasks yet')
        ->assertNoJavascriptErrors();

    expect($project->tasks()->where('name', 'First ever')->exists())->toBeTrue();
});
