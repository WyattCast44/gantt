<?php

declare(strict_types=1);

use App\Enums\InvitationStatus;
use App\Enums\Role;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('creating an invitation fills token, status, and expiry defaults', function () {
    $project = Project::factory()->create();
    $inviter = User::factory()->create();

    $invitation = $project->invitations()->create([
        'inviter_id' => $inviter->id,
        'email' => 'newcomer@example.com',
        'role' => Role::Editor,
    ]);

    expect($invitation->token)->toHaveLength(64)
        ->and($invitation->status)->toBe(InvitationStatus::Pending)
        ->and($invitation->expires_at->toDateString())
        ->toBe(now()->addDays(ProjectInvitation::EXPIRY_DAYS)->toDateString());
});

test('accepting attaches the member and marks the invitation accepted', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->withRole(Role::Editor)->create();

    $invitation->accept($user);

    expect($project->fresh()->roleFor($user))->toBe(Role::Editor)
        ->and($invitation->fresh()->status)->toBe(InvitationStatus::Accepted)
        ->and($invitation->fresh()->accepted_by)->toBe($user->id);
});

test('accepting is idempotent for an existing member', function () {
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $project = Project::factory()->withMember($user, Role::Viewer)->create();
    $invitation = ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->withRole(Role::Editor)->create();

    $invitation->accept($user);

    expect($project->members()->where('users.id', $user->id)->count())->toBe(1)
        ->and($invitation->fresh()->status)->toBe(InvitationStatus::Accepted);
});

test('an expired invitation cannot be accepted', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = ProjectInvitation::factory()->forProject($project)->forEmail('invitee@example.com')->expired()->create();

    expect(fn () => $invitation->accept($user))->toThrow(HttpException::class);
    expect($project->fresh()->isMember($user))->toBeFalse();
});

test('declining marks the invitation declined', function () {
    $invitation = ProjectInvitation::factory()->create();

    $invitation->decline();

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Declined);
});

test('revoking marks a pending invitation revoked', function () {
    $invitation = ProjectInvitation::factory()->create();

    $invitation->revoke();

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Revoked);
});

test('the pending scope returns only pending, non-expired invitations for an email', function () {
    $pending = ProjectInvitation::factory()->forEmail('casey@example.com')->create();
    ProjectInvitation::factory()->forEmail('casey@example.com')->expired()->create();
    ProjectInvitation::factory()->forEmail('casey@example.com')->declined()->create();
    ProjectInvitation::factory()->forEmail('someone@example.com')->create();

    $results = ProjectInvitation::pending()->forEmail('CASEY@example.com')->get();

    expect($results)->toHaveCount(1)
        ->and($results->first()->is($pending))->toBeTrue();
});
