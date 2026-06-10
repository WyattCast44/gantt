<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the task edit tab renders without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'EO Calibration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}?tab=edit")
        ->assertSee('Edit')
        ->assertSee('Schedule by')
        ->assertPresent('[data-testid=task-percent-readonly]')
        ->assertNotPresent('#task-percent')
        ->assertSee('Save changes')
        ->assertNoJavascriptErrors();
});

test('the task create page renders without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/create")
        ->assertSee('New task')
        ->assertSee('Schedule by')
        ->assertSee('Start + duration')
        ->assertSee('Create task')
        ->assertNoJavascriptErrors();
});

test('the tasks page renders the tree without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks")
        ->assertSee('Tasks')
        ->assertSee('Aircraft')
        ->assertSee('New task')
        ->assertNoJavascriptErrors();
});

test('the tasks empty state renders without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    visit("/projects/{$project->id}/tasks")
        ->assertSee('No tasks yet')
        ->assertNoJavascriptErrors();
});

test('the task detail page renders its tabs without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'name' => 'EO Calibration',
        'created_by' => $owner->id,
        'updated_by' => $owner->id,
    ]);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}")
        ->assertSee('EO Calibration')
        ->assertSee('Details')
        ->assertSee('Dependencies')
        ->assertSee('Mark complete')
        ->assertSee('Update progress')
        ->assertNoJavascriptErrors();
});

test('the task detail page lists its subtasks', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$parent->id}")
        ->assertSee('Subtasks')
        ->assertSee('Sensor Integration')
        ->assertSee('Add subtask')
        ->assertNoJavascriptErrors();
});

test('the task detail page offers to add subtasks when none exist yet', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'EO Calibration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}")
        ->assertSee('No subtasks yet')
        ->assertSee('Add subtask')
        ->assertNoJavascriptErrors();
});

test('the task detail page hides add subtask affordances at max depth', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'name' => 'Leaf task',
        'hierarchy_level' => 5,
    ]);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}")
        ->assertDontSee('Add subtask')
        ->assertDontSee('Subtasks')
        ->assertNoJavascriptErrors();
});

test('the task detail page links to its parent task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Sensor Integration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$child->id}")
        ->assertSee('Parent task')
        ->assertSee('Aircraft')
        ->assertNoJavascriptErrors();
});

test('the task dependencies tab renders an empty state without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'EO Calibration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}?tab=dependencies")
        ->assertSee('Depends on')
        ->assertSee('No predecessors yet')
        ->assertSee('Required by')
        ->assertSee('Nothing depends on this task yet')
        ->assertNoJavascriptErrors();
});

test('the task attachments tab renders an empty state without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create(['name' => 'EO Calibration']);
    actingAs($owner);

    visit("/projects/{$project->id}/tasks/{$task->id}?tab=attachments")
        ->assertSee('No documents attached yet')
        ->assertNoJavascriptErrors();
});
