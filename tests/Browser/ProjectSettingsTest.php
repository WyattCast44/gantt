<?php

declare(strict_types=1);

use App\Enums\Role;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('an owner can invite a member through the members tab', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    visit("/projects/{$project->id}/settings?tab=members")
        ->assertSee('Invite a member')
        ->fill('#invite-email', 'newcomer@example.com')
        ->click('Send invite')
        ->assertNoJavascriptErrors()
        ->assertSee('newcomer@example.com');

    expect($project->fresh()->invitations()->where('email', 'newcomer@example.com')->exists())->toBeTrue();
});

test('an invited user can accept from their projects page', function () {
    $project = Project::factory()->create();
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);
    ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->withRole(Role::Editor)->create();
    actingAs($invitee);

    visit('/projects')
        ->assertSee('Pending invitations')
        ->assertSee($project->name)
        ->click('Accept')
        ->assertNoJavascriptErrors();

    expect($project->fresh()->roleFor($invitee))->toBe(Role::Editor);
});
