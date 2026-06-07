<?php

declare(strict_types=1);

use App\Enums\InvitationStatus;
use App\Enums\Role;
use App\Mail\ProjectInvitationMail;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Mail::fake();
});

test('an admin can invite a member and the email is queued', function () {
    $admin = User::factory()->create();
    $project = Project::factory()->withMember($admin, Role::Admin)->create();

    $this->actingAs($admin)
        ->post(route('projects.invitations.store', $project), [
            'email' => 'newbie@example.com',
            'role' => Role::Editor->value,
        ])
        ->assertRedirect();

    $invitation = $project->invitations()->where('email', 'newbie@example.com')->firstOrFail();

    expect($invitation->inviter_id)->toBe($admin->id);
    Mail::assertQueued(ProjectInvitationMail::class);
});

test('an editor cannot invite a member', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();

    $this->actingAs($editor)
        ->post(route('projects.invitations.store', $project), [
            'email' => 'newbie@example.com',
            'role' => Role::Editor->value,
        ])
        ->assertForbidden();
});

test('a duplicate pending invitation is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    ProjectInvitation::factory()->forProject($project)->forEmail('dup@example.com')->create();

    $this->actingAs($owner)
        ->post(route('projects.invitations.store', $project), [
            'email' => 'dup@example.com',
            'role' => Role::Viewer->value,
        ])
        ->assertInvalid(['email']);
});

test('the owner cannot be invited', function () {
    $owner = User::factory()->create(['email' => 'owner@example.com']);
    $project = Project::factory()->withOwner($owner)->create();

    $this->actingAs($owner)
        ->post(route('projects.invitations.store', $project), [
            'email' => 'owner@example.com',
            'role' => Role::Editor->value,
        ])
        ->assertInvalid(['email']);
});

test('an existing member cannot be invited', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create(['email' => 'member@example.com']);
    $project = Project::factory()->withOwner($owner)->withMember($member, Role::Viewer)->create();

    $this->actingAs($owner)
        ->post(route('projects.invitations.store', $project), [
            'email' => 'member@example.com',
            'role' => Role::Editor->value,
        ])
        ->assertInvalid(['email']);
});

test('a manager can revoke a pending invitation', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $invitation = ProjectInvitation::factory()->forProject($project)->create();

    $this->actingAs($owner)
        ->delete(route('projects.invitations.destroy', [$project, $invitation]))
        ->assertRedirect();

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Revoked);
});

test('a guest is redirected to login from an invitation link', function () {
    $invitation = ProjectInvitation::factory()->create();

    $this->get(route('invitations.show', $invitation->token))
        ->assertRedirect(route('login'));
});

test('the matching invitee can view and accept an invitation', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->withRole(Role::Editor)->create();

    $this->actingAs($user)->get(route('invitations.show', $invitation->token))->assertOk();

    $this->actingAs($user)
        ->post(route('invitations.accept', $invitation))
        ->assertRedirect(route('projects.show', $project));

    expect($project->fresh()->roleFor($user))->toBe(Role::Editor)
        ->and($invitation->fresh()->status)->toBe(InvitationStatus::Accepted);
});

test('a non-matching user cannot accept an invitation', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create(['email' => 'other@example.com']);
    $invitation = ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->create();

    $this->actingAs($user)
        ->post(route('invitations.accept', $invitation))
        ->assertForbidden();

    expect($project->fresh()->isMember($user))->toBeFalse();
});

test('the matching invitee can decline an invitation', function () {
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = ProjectInvitation::factory()->forEmail('invitee@example.com')->create();

    $this->actingAs($user)
        ->post(route('invitations.decline', $invitation))
        ->assertRedirect(route('projects.index'));

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Declined);
});

test('an expired invitation cannot be accepted', function () {
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = ProjectInvitation::factory()->forEmail('invitee@example.com')->expired()->create();

    $this->actingAs($user)
        ->post(route('invitations.accept', $invitation))
        ->assertStatus(410);
});
