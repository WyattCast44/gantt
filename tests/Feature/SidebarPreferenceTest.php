<?php

declare(strict_types=1);

use App\Models\User;

test('the sidebar collapsed state is persisted to the session', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('sidebar.collapsed'), ['collapsed' => true])
        ->assertRedirect();

    expect(session('sidebar_collapsed'))->toBeTrue();
});

test('the sidebar width is persisted to the session', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('sidebar.width'), ['width' => 300])
        ->assertRedirect();

    expect(session('sidebar_width'))->toBe(300);
});

test('the sidebar width is bounded', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('sidebar.width'), ['width' => 50])
        ->assertInvalid(['width']);
});
