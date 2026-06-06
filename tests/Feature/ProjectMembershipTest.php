<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;

test('role capability predicates', function (Role $role, bool $manage, bool $edit) {
    expect($role->canManageMembers())->toBe($manage)
        ->and($role->canConfigureProject())->toBe($manage)
        ->and($role->canEdit())->toBe($edit);
})->with([
    'owner' => [Role::Owner, true, true],
    'admin' => [Role::Admin, true, true],
    'editor' => [Role::Editor, false, true],
    'viewer' => [Role::Viewer, false, false],
]);

test('the owner is resolved authoritatively via owner_id', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    expect($project->owner->is($owner))->toBeTrue()
        ->and($project->isOwner($owner))->toBeTrue()
        ->and($project->isMember($owner))->toBeTrue()
        ->and($project->roleFor($owner))->toBe(Role::Owner);
});

test('the owner is mirrored into the membership pivot on create', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    expect($project->members()->where('users.id', $owner->id)->exists())->toBeTrue()
        ->and($project->members()->wherePivot('role', Role::Owner->value)->count())->toBe(1);
});

test('a project exposes the role an invited member holds', function (Role $role) {
    $user = User::factory()->create();
    $project = Project::factory()->withMember($user, $role)->create();

    expect($project->isMember($user))->toBeTrue()
        ->and($project->isOwner($user))->toBeFalse()
        ->and($project->roleFor($user))->toBe($role);
})->with([
    'admin' => [Role::Admin],
    'editor' => [Role::Editor],
    'viewer' => [Role::Viewer],
]);

test('a non-member has no role on a project', function () {
    $project = Project::factory()->create();
    $stranger = User::factory()->create();

    expect($project->isMember($stranger))->toBeFalse()
        ->and($project->roleFor($stranger))->toBeNull();
});

test('ownedProjects lists only owned projects', function () {
    $user = User::factory()->create();
    $owned = Project::factory()->withOwner($user)->create();
    Project::factory()->withMember($user, Role::Editor)->create();
    Project::factory()->create();

    expect($user->ownedProjects)->toHaveCount(1)
        ->and($user->ownedProjects->first()->is($owned))->toBeTrue();
});

test('projects lists every accessible project in a single query', function () {
    $user = User::factory()->create();
    $owned = Project::factory()->withOwner($user)->create();
    $joined = Project::factory()->withMember($user, Role::Editor)->create();
    Project::factory()->create();

    expect($user->projects->pluck('id'))
        ->toHaveCount(2)
        ->toContain($owned->id, $joined->id);

    expect($user->projects->firstWhere('id', $owned->id)->pivot->role)->toBe(Role::Owner->value);
    expect($user->projects->firstWhere('id', $joined->id)->pivot->role)->toBe(Role::Editor->value);
});

test('a project factory creates a project whose only member is the owner', function () {
    $project = Project::factory()->create();

    expect($project->owner)->not->toBeNull()
        ->and($project->members)->toHaveCount(1)
        ->and($project->members->first()->is($project->owner))->toBeTrue();
});
