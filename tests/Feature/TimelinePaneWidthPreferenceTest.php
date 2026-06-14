<?php

declare(strict_types=1);

use App\Models\User;

test('the timeline pane width is persisted to the session', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('timeline-pane.width'), ['width' => 400])
        ->assertRedirect();

    expect(session('timeline_pane_width'))->toBe(400);
});

test('the timeline pane width is bounded', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('timeline-pane.width'), ['width' => 100])
        ->assertInvalid(['width']);
});
