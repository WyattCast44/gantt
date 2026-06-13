<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('right-clicking a row opens the task context menu', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->rightClick('Aircraft');

    $page->assertSee('New task below')
        ->assertSee('New subtask')
        ->assertSee('Link to successor…')
        ->assertSee('Open details')
        ->assertNoJavascriptErrors();
});

test('the context menu can quick-create a task below the clicked row', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    Task::factory()->forProject($project)->create(['name' => 'Trailing', 'start_date' => '2026-01-20', 'sort_order' => 2]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->rightClick('Aircraft');
    $page->click('New task below');
    $page->type('[data-testid=quick-create-input]', 'Inserted');
    $page->keys('[data-testid=quick-create-input]', 'Enter');
    $page->wait(0.6);

    $page->assertSee('Inserted')->assertNoJavascriptErrors();

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())
        ->toBe(['Aircraft', 'Inserted', 'Trailing']);
});

test('a dependency can be created via the context-menu link mode', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'start_date' => '2026-02-01', 'sort_order' => 2]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Calibrate');

    $page->rightClick('Calibrate');
    $page->click('Link to successor…');
    $page->assertSee('click the task that should come after it');

    $page->click('Verify');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($successor->predecessors()->pluck('tasks.id')->all())->toBe([$predecessor->id]);
});

test('dragging the connector handle onto another task creates a dependency', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'start_date' => '2026-02-01', 'sort_order' => 2]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Calibrate');

    $page->drag("[data-testid=link-handle-{$predecessor->id}]", "[id=gantt-row-{$successor->id}]");
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($successor->predecessors()->pluck('tasks.id')->all())->toBe([$predecessor->id]);
});

test('an invalid link target is rejected client-side', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Avionics', 'start_date' => '2026-01-06']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Avionics');

    // A parent cannot depend on its own subtask (hierarchy already links them).
    $page->rightClick('Avionics');
    $page->click('Link to successor…');
    $page->click('Aircraft');
    $page->wait(0.4);

    $page->assertNoJavascriptErrors();

    expect($parent->refresh()->predecessors()->count())->toBe(0);
});

test('a connector can be removed from the timeline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'start_date' => '2026-02-01', 'sort_order' => 2]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Verify');

    // Click the connector's enlarged hit path (its bounding-box centre may sit
    // off the stroke, so dispatch the event on the element directly).
    $page->script("(() => {
        const hit = document.querySelector('[data-testid=dependency-hit-{$predecessor->id}-{$successor->id}]');
        const rect = hit.getBoundingClientRect();
        hit.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: rect.x + 4, clientY: rect.y + 4 }));
    })()");
    $page->wait(0.2);

    $page->assertSee('Remove dependency');
    $page->click('Remove dependency');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($successor->predecessors()->count())->toBe(0);
});

test('the dependencies submenu lists and removes predecessors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'start_date' => '2026-02-01', 'sort_order' => 2]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Verify');

    $page->rightClick('Verify');
    $page->click('Dependencies');
    $page->click('Remove “Calibrate”');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($successor->predecessors()->count())->toBe(0);
});

test('a conflicting link rides the schedule-preview confirm flow', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    // The successor is fully pinned and starts before the predecessor ends, so
    // the new edge cannot be resolved by sliding — the engine flashes a preview.
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-02-01', 'duration_days' => 10, 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->pinned()->create(['name' => 'Verify', 'start_date' => '2026-01-05', 'duration_days' => 2, 'sort_order' => 2]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Calibrate');

    $page->rightClick('Calibrate');
    $page->click('Link to successor…');
    $page->click('Verify');
    $page->wait(0.6);

    $page->assertSee('This change creates schedule conflicts');

    $page->click('Apply anyway');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($successor->predecessors()->pluck('tasks.id')->all())->toBe([$predecessor->id]);
});

test('a viewer sees no connector handles or task context actions', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($viewer);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->assertMissing("[data-testid=link-handle-{$task->id}]");

    $page->rightClick('Aircraft');
    $page->assertSee('Open details');
    $page->assertDontSee('New task below');
    $page->assertDontSee('Delete…');
    $page->assertNoJavascriptErrors();
});
