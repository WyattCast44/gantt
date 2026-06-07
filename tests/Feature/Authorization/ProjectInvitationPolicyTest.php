<?php

declare(strict_types=1);

use App\Models\ProjectInvitation;
use App\Models\User;

test('an invitee whose email matches may respond', function () {
    $user = User::factory()->create(['email' => 'casey@example.com']);
    $invitation = ProjectInvitation::factory()->forEmail('casey@example.com')->create();

    expect($user->can('respondToInvitation', $invitation))->toBeTrue();
});

test('email matching is case-insensitive', function () {
    $user = User::factory()->create(['email' => 'Casey@Example.com']);
    $invitation = ProjectInvitation::factory()->forEmail('casey@example.com')->create();

    expect($user->can('respondToInvitation', $invitation))->toBeTrue();
});

test('a user whose email does not match may not respond', function () {
    $user = User::factory()->create(['email' => 'other@example.com']);
    $invitation = ProjectInvitation::factory()->forEmail('casey@example.com')->create();

    expect($user->can('respondToInvitation', $invitation))->toBeFalse();
});
