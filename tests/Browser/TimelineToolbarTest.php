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

test('the search input filters tasks and selecting a hit reveals it', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Airframe', 'start_date' => '2026-01-05']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Fuselage panel', 'start_date' => '2026-01-06']);
    Task::factory()->forProject($project)->create(['name' => 'Landing gear', 'start_date' => '2026-01-07']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Airframe');

    // Collapse the tree so the nested match is not initially visible.
    $page->click('Collapse all');
    $page->assertDontSee('Fuselage panel');

    $page->type('[data-testid=timeline-search]', 'fuselage');
    $page->wait(0.4);

    // The dropdown lists the match with its parent breadcrumb.
    $page->assertSee('Fuselage panel')->assertSee('Airframe');

    $page->keys('[data-testid=timeline-search]', 'Enter');
    $page->wait(0.4);

    // Selecting expands the ancestor and selects the (now revealed) task row.
    $fuselageId = $project->tasks()->where('name', 'Fuselage panel')->value('id');

    $page->assertSee('Fuselage panel')
        ->assertAttribute('[id="gantt-row-'.$fuselageId.'"]', 'aria-selected', 'true')
        ->assertNoJavascriptErrors();
});

test('pressing the slash hotkey focuses the search input', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Airframe', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Airframe');

    $page->keys('[data-testid=gantt-scroll]', '/');
    $page->wait(0.2);

    // Typing now lands in the search box, opening the results dropdown.
    $page->type('[data-testid=timeline-search]', 'airframe');
    $page->wait(0.4);

    $page->assertVisible('#timeline-search-results')->assertNoJavascriptErrors();
});

test('the search dropdown reports when nothing matches', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Airframe', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Airframe');

    $page->type('[data-testid=timeline-search]', 'zzznope');
    $page->wait(0.4);

    $page->assertSee('No matching tasks.')->assertNoJavascriptErrors();
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
