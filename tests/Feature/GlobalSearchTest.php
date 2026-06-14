<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

test('search returns matching projects, tasks, and documents the user can access', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create(['name' => 'Zephyr Initiative']);
    Task::factory()->forProject($project)->create(['name' => 'Zephyr launch checklist']);
    Document::factory()->forProject($project)->create(['name' => 'Zephyr runbook']);

    $response = $this->actingAs($user)->getJson(route('search', ['q' => 'Zephyr']));

    $response->assertOk();

    $types = collect($response->json('groups'))->pluck('type')->all();
    expect($types)->toContain('projects', 'tasks', 'documents');
});

test('search excludes records from projects the user is not a member of', function () {
    $user = User::factory()->create();
    $foreign = Project::factory()->create(['name' => 'Obsidian Program']);
    Task::factory()->forProject($foreign)->create(['name' => 'Obsidian recon task']);

    $response = $this->actingAs($user)->getJson(route('search', ['q' => 'Obsidian']));

    $response->assertOk();
    expect($response->json('groups'))->toBe([]);
});

test('search surfaces current-project hits first within a group', function () {
    $user = User::factory()->create();
    $current = Project::factory()->withMember($user, Role::Editor)->create();
    $other = Project::factory()->withMember($user, Role::Editor)->create();

    Task::factory()->forProject($other)->create(['name' => 'Falcon sweep']);
    $currentTask = Task::factory()->forProject($current)->create(['name' => 'Falcon patrol']);

    $response = $this->actingAs($user)->getJson(route('search', [
        'q' => 'Falcon',
        'project' => $current->id,
    ]));

    $response->assertOk();

    $taskGroup = collect($response->json('groups'))->firstWhere('type', 'tasks');
    expect($taskGroup['items'][0]['id'])->toBe($currentTask->id);
});

test('a blank or too-short query returns no groups', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create(['name' => 'Aurora']);
    Task::factory()->forProject($project)->create(['name' => 'Aurora task']);

    $this->actingAs($user)->getJson(route('search', ['q' => '']))
        ->assertOk()
        ->assertExactJson(['query' => '', 'groups' => []]);

    $this->actingAs($user)->getJson(route('search', ['q' => 'a']))
        ->assertOk()
        ->assertJsonPath('groups', []);
});

test('search requires authentication', function () {
    $this->get(route('search', ['q' => 'anything']))->assertRedirect(route('login'));
});
