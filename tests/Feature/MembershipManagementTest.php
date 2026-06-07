<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;

test('an admin can change a member role', function () {
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project = Project::factory()->withMember($admin, Role::Admin)->withMember($member, Role::Viewer)->create();

    $this->actingAs($admin)
        ->patch(route('projects.members.update', [$project, $member]), ['role' => Role::Editor->value])
        ->assertRedirect();

    expect($project->fresh()->roleFor($member))->toBe(Role::Editor);
});

test('an admin can remove a member', function () {
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project = Project::factory()->withMember($admin, Role::Admin)->withMember($member, Role::Editor)->create();

    $this->actingAs($admin)
        ->delete(route('projects.members.destroy', [$project, $member]))
        ->assertRedirect();

    expect($project->fresh()->isMember($member))->toBeFalse();
});

test('an editor cannot manage members', function () {
    $editor = User::factory()->create();
    $member = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->withMember($member, Role::Viewer)->create();

    $this->actingAs($editor)
        ->patch(route('projects.members.update', [$project, $member]), ['role' => Role::Editor->value])
        ->assertForbidden();
});

test('the owner cannot be demoted through the route', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($admin, Role::Admin)->create();

    $this->actingAs($admin)
        ->patch(route('projects.members.update', [$project, $owner]), ['role' => Role::Viewer->value])
        ->assertForbidden();

    expect($project->fresh()->roleFor($owner))->toBe(Role::Owner);
});

test('the owner cannot be removed through the route', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($admin, Role::Admin)->create();

    $this->actingAs($admin)
        ->delete(route('projects.members.destroy', [$project, $owner]))
        ->assertForbidden();

    expect($project->fresh()->isMember($owner))->toBeTrue();
});
