<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('it changes an invited member role', function () {
    $member = User::factory()->create();
    $project = Project::factory()->withMember($member, Role::Viewer)->create();

    $project->updateMemberRole($member, Role::Editor);

    expect($project->roleFor($member))->toBe(Role::Editor);
});

test('it removes an invited member', function () {
    $member = User::factory()->create();
    $project = Project::factory()->withMember($member, Role::Editor)->create();

    $project->removeMember($member);

    expect($project->isMember($member))->toBeFalse();
});

test('the owner cannot be demoted', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    expect(fn () => $project->updateMemberRole($owner, Role::Viewer))->toThrow(HttpException::class);
    expect($project->fresh()->roleFor($owner))->toBe(Role::Owner);
});

test('the owner cannot be removed', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    expect(fn () => $project->removeMember($owner))->toThrow(HttpException::class);
    expect($project->fresh()->isMember($owner))->toBeTrue();
});
