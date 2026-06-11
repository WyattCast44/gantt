<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the timeline renders the gantt grid without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create([
        'name' => 'Aircraft',
        'start_date' => '2026-01-05',
        'organization' => 'Test Squadron',
        'lock_start' => true,
        'lock_duration' => true,
    ]);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration', 'start_date' => '2026-01-10']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->assertSee('Timeline')
        ->assertSee('Aircraft')
        ->assertSee('Sensor Integration')
        ->assertSee('Test Squadron')
        ->assertSee('Expand all')
        ->assertSee('Quarter')
        ->assertNoJavascriptErrors();
});

test('the timeline preserves the viewport date when switching zoom levels', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft = 5000");
    $page->wait(0.2);

    $before = $page->script("(() => { const el = document.querySelector('[data-testid=gantt-scroll]'); const track = el.clientWidth - 320; return Math.round((el.scrollLeft + track / 2) / 8); })()");

    $page->click('Day');
    $page->wait(0.3);

    $after = $page->script("(() => { const el = document.querySelector('[data-testid=gantt-scroll]'); const track = el.clientWidth - 320; return Math.round((el.scrollLeft + track / 2) / 40); })()");

    expect(abs($after - $before))->toBeLessThan(2);
    $page->assertNoJavascriptErrors();
});

test('the timeline can switch zoom and collapse the tree without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration', 'start_date' => '2026-01-10']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");

    // Switch the time scale (Year folds detail; Day renders weekend shading).
    $page->click('Year')
        ->assertNoJavascriptErrors();

    $page->click('Day')
        ->assertNoJavascriptErrors();

    // Collapsing should hide the child row.
    $page->click('Collapse all')
        ->assertDontSee('Sensor Integration')
        ->assertNoJavascriptErrors();

    $page->click('Expand all')
        ->assertSee('Sensor Integration')
        ->assertNoJavascriptErrors();
});

test('the timeline draws dependency lines without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create(['name' => 'Calibrate', 'start_date' => '2026-01-05', 'sort_order' => 1]);
    $successor = Task::factory()->forProject($project)->create(['name' => 'Verify', 'start_date' => '2026-02-01', 'sort_order' => 2]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->assertSee('Calibrate')
        ->assertSee('Verify')
        ->assertNoJavascriptErrors();
});

test('the timeline extends the calendar when scrolled to the right edge', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $before = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollWidth");

    // Jump to the right edge; the scroll listener should grow the range.
    $page->script("(() => { const el = document.querySelector('[data-testid=gantt-scroll]'); el.scrollLeft = el.scrollWidth; })()");
    $page->wait(0.4);

    $after = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollWidth");

    expect($after)->toBeGreaterThan($before);
    $page->assertNoJavascriptErrors();
});

test('the timeline day view shows weekday letters in the axis', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->click('Day')
        ->assertPresent('[data-testid=axis-tertiary] [data-axis-segment]')
        ->assertSee('M')
        ->assertNoJavascriptErrors();
});

test('the timeline quarter view labels quarters with their calendar year', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->click('Quarter')
        ->assertSee('Q1 / 2026')
        ->assertNoJavascriptErrors();
});

test('the timeline month view shows fiscal year context in the axis', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->click('Month')
        ->assertPresent('[data-testid=axis-fiscal-year] [data-axis-segment]')
        ->assertSee('FY')
        ->assertNoJavascriptErrors();
});

test('the timeline shows a today marker when the current date is in range', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->assertSee('Aircraft')
        ->assertPresent('[data-testid=today-line]')
        ->assertNoJavascriptErrors();
});

test('the timeline zoom hotkeys switch the time scale', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $page->script("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true }))");
    $page->wait(0.2);
    $page->assertScript("document.querySelector('[aria-label=\"Zoom level\"] [aria-pressed=\"true\"]')?.textContent?.trim() === 'Year'");

    $page->script("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))");
    $page->wait(0.2);
    $page->assertScript("document.querySelector('[aria-label=\"Zoom level\"] [aria-pressed=\"true\"]')?.textContent?.trim() === 'Day'");

    $page->assertNoJavascriptErrors();
});

test('the timeline today hotkey moves the viewport to the current week', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $before = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    $page->script("document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }))");
    $page->wait(0.3);

    $after = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    expect($after)->toBeGreaterThan($before);
    $page->assertNoJavascriptErrors();
});

test('the timeline today button moves the viewport to the current week', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $before = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    $page->click('[aria-label="Go to current week"]');
    $page->wait(0.3);

    $after = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    expect($after)->toBeGreaterThan($before);
    $page->assertNoJavascriptErrors();
});

test('the timeline navigation buttons move the viewport', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    $before = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    $page->click('[aria-label="Scroll forward"]');
    $page->wait(0.5);

    $after = $page->script("document.querySelector('[data-testid=gantt-scroll]').scrollLeft");

    expect($after)->toBeGreaterThan($before);
    $page->assertNoJavascriptErrors();
});

test('the timeline can reorder a task with the move button', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Task::factory()->forProject($project)->create(['name' => 'Alpha', 'sort_order' => 1, 'start_date' => '2026-01-05']);
    Task::factory()->forProject($project)->create(['name' => 'Bravo', 'sort_order' => 2, 'start_date' => '2026-01-05']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Alpha')->assertSee('Bravo');

    // Move the first root task down via its button, then let the PATCH settle.
    $page->script('document.querySelectorAll(\'[aria-label="Move down"]\')[0].click()');
    $page->wait(0.5);

    $page->assertNoJavascriptErrors();

    expect($project->tasks()->orderBy('sort_order')->pluck('name')->all())->toBe(['Bravo', 'Alpha']);
});

test('the timeline marks conflicted dependencies with a red dashed line and a bar badge', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $predecessor = Task::factory()->forProject($project)->create([
        'name' => 'Calibrate',
        'start_date' => '2026-01-05',
        'duration_days' => 10,
        'duration_unit' => DurationUnit::CalendarDays,
        'sort_order' => 1,
    ]);
    // Pinned successor overlapping its predecessor: a live schedule conflict.
    $successor = Task::factory()->forProject($project)->pinned()->create([
        'name' => 'Verify',
        'start_date' => '2026-01-08',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
        'sort_order' => 2,
    ]);
    $successor->predecessors()->attach($predecessor->id, ['type' => 'finish_to_start']);
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->assertSee('Verify')
        ->assertPresent('[data-conflict="true"]')
        ->assertPresent('[data-testid=schedule-conflict-badge]')
        ->assertNoJavascriptErrors();
});

test('a conflicting schedule edit asks for confirmation before applying', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'name' => 'Calibrate',
        'start_date' => '2026-01-05',
        'duration_days' => 2,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned = Task::factory()->forProject($project)->pinned()->create([
        'name' => 'Demo day',
        'start_date' => '2026-01-12',
        'duration_days' => 1,
        'duration_unit' => DurationUnit::CalendarDays,
    ]);
    $pinned->predecessors()->attach($task->id, ['type' => 'finish_to_start']);
    actingAs($owner);

    // Extend the task through the pinned successor's start: the engine
    // previews the conflict instead of committing.
    $page = visit("/projects/{$project->id}/tasks/{$task->id}?tab=edit");
    $page->fill('#task-duration', '10')
        ->click('Save changes')
        ->assertSee('This change creates schedule conflicts')
        ->assertSee('Demo day');

    expect($task->refresh()->duration_days)->toBe(2);

    $page->click('Apply anyway');
    $page->wait(0.5);
    $page->assertNoJavascriptErrors();

    expect($task->refresh()->duration_days)->toBe(10)
        ->and($pinned->refresh()->start_date->toDateString())->toBe('2026-01-12');
});

test('the timeline shows an empty state when there are no tasks', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    visit("/projects/{$project->id}/timeline")
        ->assertSee('No tasks yet')
        ->assertSee('New task')
        ->assertNoJavascriptErrors();
});
