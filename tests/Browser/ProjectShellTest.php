<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the project workspace pages render without javascript errors', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    actingAs($user);

    $pages = visit([
        '/projects',
        '/projects/create',
        "/projects/{$project->id}",
        "/projects/{$project->id}/settings",
    ]);

    $pages->assertNoSmoke();
});

test('a user can navigate from the projects list to the create form', function () {
    $user = User::factory()->create();
    actingAs($user);

    visit('/projects')
        ->assertSee('Projects')
        ->click('New project')
        ->assertPathIs('/projects/create')
        ->assertNoJavascriptErrors()
        ->assertSee('New project');
});
