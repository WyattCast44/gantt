<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;

test('the owner may reach a project-scoped route', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();

    $this->actingAs($user)->get("/projects/{$project->id}")->assertSuccessful();
});

test('an invited member may reach a project-scoped route', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withMember($user, Role::Viewer)->create();

    $this->actingAs($user)->get("/projects/{$project->id}")->assertSuccessful();
});

test('a non-member is forbidden from a project-scoped route', function () {
    $project = Project::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->get("/projects/{$project->id}")->assertForbidden();
});

test('a guest is redirected to login from a project-scoped route', function () {
    $project = Project::factory()->create();

    $this->get("/projects/{$project->id}")->assertRedirect('/login');
});
