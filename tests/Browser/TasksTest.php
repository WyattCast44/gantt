<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

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
