<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;

/**
 * Create a user holding the given role on a fresh project. A null role yields
 * a project the user has no relationship to.
 *
 * @return array{0: User, 1: Project}
 */
function projectForRole(?Role $role): array
{
    $user = User::factory()->create();

    $project = match ($role) {
        Role::Owner => Project::factory()->withOwner($user)->create(),
        null => Project::factory()->create(),
        default => Project::factory()->withMember($user, $role)->create(),
    };

    return [$user, $project];
}

test('any authenticated user may create a project', function () {
    expect(User::factory()->create()->can('create', Project::class))->toBeTrue();
});

test('project abilities resolve by role', function (?Role $role, array $can) {
    [$user, $project] = projectForRole($role);

    expect($user->can('view', $project))->toBe($can['view'])
        ->and($user->can('update', $project))->toBe($can['update'])
        ->and($user->can('manageMembers', $project))->toBe($can['manageMembers'])
        ->and($user->can('updateSettings', $project))->toBe($can['updateSettings'])
        ->and($user->can('delete', $project))->toBe($can['delete']);
})->with([
    'owner' => [Role::Owner, [
        'view' => true, 'update' => true, 'manageMembers' => true, 'updateSettings' => true, 'delete' => true,
    ]],
    'admin' => [Role::Admin, [
        'view' => true, 'update' => true, 'manageMembers' => true, 'updateSettings' => true, 'delete' => false,
    ]],
    'editor' => [Role::Editor, [
        'view' => true, 'update' => true, 'manageMembers' => false, 'updateSettings' => false, 'delete' => false,
    ]],
    'viewer' => [Role::Viewer, [
        'view' => true, 'update' => false, 'manageMembers' => false, 'updateSettings' => false, 'delete' => false,
    ]],
    'non-member' => [null, [
        'view' => false, 'update' => false, 'manageMembers' => false, 'updateSettings' => false, 'delete' => false,
    ]],
]);
