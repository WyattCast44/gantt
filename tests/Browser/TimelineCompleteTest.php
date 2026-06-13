<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the task context menu marks a leaf task complete', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create([
        'name' => 'Calibrate',
        'start_date' => '2026-01-05',
        'percent_complete' => 40,
    ]);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Calibrate');

    $page->rightClick('Calibrate');
    $page->click('Mark complete');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($task->refresh())
        ->status->toBe(TaskStatus::Complete)
        ->percent_complete->toBe(100);
});

test('the task context menu completes a parent and its incomplete subtasks', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $parent = Task::factory()->forProject($project)->create(['name' => 'Aircraft', 'start_date' => '2026-01-05']);
    $child = Task::factory()->forProject($project)->child($parent)->create(['name' => 'Avionics', 'start_date' => '2026-01-06']);
    actingAs($owner);

    $page = visit("/projects/{$project->id}/timeline");
    $page->assertSee('Aircraft');

    // The parent has an incomplete descendant, so the action cascades.
    $page->rightClick('Aircraft');
    $page->click('Mark complete with subtasks');
    $page->wait(0.6);

    $page->assertNoJavascriptErrors();

    expect($parent->refresh()->status)->toBe(TaskStatus::Complete);
    expect($child->refresh()->status)->toBe(TaskStatus::Complete);
});
