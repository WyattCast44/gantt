<?php

declare(strict_types=1);

use App\Enums\ProjectStatus;
use App\Enums\Role;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the index lists only accessible projects', function () {
    $user = User::factory()->create();
    Project::factory()->withOwner($user)->create();
    Project::factory()->withMember($user, Role::Viewer)->create();
    Project::factory()->create();

    $this->actingAs($user)->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Index', false)
            ->has('projects', 2)
        );
});

test('the index surfaces the owner archived projects', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $project->delete();

    $this->actingAs($user)->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects', 0)
            ->has('archivedProjects', 1)
        );
});

test('a user can view the create form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Projects/Create', false));
});

test('a user can create a project and becomes its owner', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Operational Test Alpha',
        'description' => 'First campaign',
    ]);

    $project = Project::where('name', 'Operational Test Alpha')->firstOrFail();

    $response->assertRedirect(route('projects.show', $project));

    expect($project->owner_id)->toBe($user->id)
        ->and($project->status)->toBe(ProjectStatus::Active)
        ->and($project->roleFor($user))->toBe(Role::Owner);
});

test('creating a project requires a name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('projects.store'), ['name' => ''])
        ->assertInvalid(['name']);
});

test('an editor can update project data', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)->patch(route('projects.update', $project), [
        'name' => 'Renamed Campaign',
    ])->assertRedirect();

    expect($project->fresh()->name)->toBe('Renamed Campaign');
});

test('a viewer cannot update project data', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();

    $this->actingAs($viewer)->patch(route('projects.update', $project), [
        'name' => 'Nope',
    ])->assertForbidden();
});

test('only the owner can archive a project', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($admin, Role::Admin)->create();

    $this->actingAs($admin)->delete(route('projects.archive', $project))->assertForbidden();
    expect($project->fresh()->trashed())->toBeFalse();

    $this->actingAs($owner)->delete(route('projects.archive', $project))->assertRedirect(route('projects.index'));
    expect($project->fresh()->trashed())->toBeTrue();
});

test('the owner can restore an archived project', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $project->delete();

    $this->actingAs($owner)->patch(route('projects.restore', $project))
        ->assertRedirect(route('projects.index'));

    expect($project->fresh()->trashed())->toBeFalse();
});
